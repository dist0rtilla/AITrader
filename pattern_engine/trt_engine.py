"""TensorRT engine loader and simple runner.

This module is guarded: if the `tensorrt` Python bindings are not
available the module exposes stub functions that raise informative
RuntimeError when used. The goal is to allow the rest of the codebase to
import this module safely even in CPU-only CI environments.
"""
from typing import Optional
import os
import logging

logger = logging.getLogger(__name__)

try:
    import tensorrt as trt  # type: ignore
    HAS_TRT = True
except Exception:  # pragma: no cover - environment dependent
    trt = None  # type: ignore
    HAS_TRT = False


def has_tensorrt() -> bool:
    return HAS_TRT


class TRTEngine:
    """Wraps a serialized TRT engine and provides a simple infer() API.

    This is intentionally minimal; it assumes the engine expects a single
    input named 'input' and returns a single output named 'output'. You can
    extend it later for named IO and dynamic shapes.
    """

    def __init__(self, engine_path: str):
        if not HAS_TRT:
            raise RuntimeError("TensorRT bindings not available in this environment")
        self.engine_path = engine_path
        self._load_engine()

    def _load_engine(self):
        # Basic serialization loader — expand as needed for CUDA context management.
        # Use a module-level TRT logger for consistent verbosity and to avoid
        # creating multiple transient logger instances.
        TRT_LOGGER = trt.Logger(trt.Logger.INFO)
        runtime = trt.Runtime(TRT_LOGGER)
        with open(self.engine_path, "rb") as f:
            engine_data = f.read()
        self.engine = runtime.deserialize_cuda_engine(engine_data)
        if self.engine is None:
            raise RuntimeError(f"Failed to deserialize TRT engine: {self.engine_path}")
        logger.info("Deserialized TRT engine: %s", self.engine_path)
        # create an execution context
        self.context = self.engine.create_execution_context()

        # collect binding metadata and index by name for convenience
        self.bindings = []
        self.binding_map = {}
        self.input_binding_idxs = []
        self.output_binding_idxs = []
        for i in range(self.engine.num_bindings):
            name = self.engine.get_binding_name(i)
            is_input = self.engine.binding_is_input(i)
            dtype = trt.nptype(self.engine.get_binding_dtype(i))
            # try to get static binding shape; for dynamic shapes, context can provide shape
            try:
                shape = tuple(self.engine.get_binding_shape(i))
            except Exception:
                shape = None
            meta = {
                "index": i,
                "name": name,
                "is_input": is_input,
                "dtype": dtype,
                "shape": shape,
            }
            self.bindings.append(meta)
            self.binding_map[name] = meta
            if is_input:
                self.input_binding_idxs.append(i)
            else:
                self.output_binding_idxs.append(i)

    def infer(self, inputs):
        """Run inference.

        `inputs` may be a single numpy array (for single-input engines) or a
        mapping {input_name: numpy_array} for models with multiple inputs.

        The implementation will try PyCUDA first and fall back to an informative
        error if no CUDA buffer backend is available.
        """
        import numpy as np

        # Normalize inputs into a mapping of binding index -> host array
        if isinstance(inputs, dict):
            input_map = {}
            for name, arr in inputs.items():
                if name not in self.binding_map:
                    raise RuntimeError(f"Unknown input binding name: {name}")
                meta = self.binding_map[name]
                if not meta['is_input']:
                    raise RuntimeError(f"Binding {name} is not marked as input")
                input_map[meta['index']] = np.ascontiguousarray(arr)
        else:
            # single-array case: require exactly one input binding
            if len(self.input_binding_idxs) != 1:
                raise RuntimeError("TRTEngine.infer requires a mapping for multi-input models")
            in_idx = self.input_binding_idxs[0]
            input_map = {in_idx: np.ascontiguousarray(inputs)}

        # attempt PyCUDA-backed path
        try:
            import pycuda.autoinit  # type: ignore
            import pycuda.driver as cuda  # type: ignore

            # create a CUDA stream for async execution
            stream = cuda.Stream()

            # allocate device buffers for all bindings we will use
            device_ptrs = [0] * self.engine.num_bindings
            host_outputs = {}

            # input allocations
            for idx, h_arr in input_map.items():
                # coerce dtype to expected (safe cast)
                expected_dtype = self.bindings[idx]['dtype']
                if h_arr.dtype != expected_dtype:
                    try:
                        h_arr = h_arr.astype(expected_dtype)
                    except Exception:
                        raise RuntimeError(f"Cannot coerce input dtype {h_arr.dtype} to expected {expected_dtype} for binding index {idx}")

                # handle dynamic binding shapes: set binding shape on context if network expects
                meta = self.bindings[idx]
                provided_shape = tuple(int(s) for s in h_arr.shape)
                if meta['shape'] is None or any((ms in (0, -1)) for ms in meta['shape'] or []):
                    # set concrete shape for dynamic binding
                    try:
                        self.context.set_binding_shape(idx, provided_shape)
                    except Exception as e:
                        raise RuntimeError(f"Failed to set dynamic binding shape for index {idx}: {e}")
                else:
                    # validate static shape compatibility
                    static_shape = tuple(int(s) for s in meta['shape'])
                    if len(static_shape) != len(provided_shape) or any((ms != ps) for ms, ps in zip(static_shape, provided_shape)):
                        raise RuntimeError(f"Input shape {provided_shape} incompatible with engine binding shape {static_shape} for binding index {idx}")

                dptr = cuda.mem_alloc(h_arr.nbytes)
                cuda.memcpy_htod_async(dptr, h_arr, stream)
                device_ptrs[idx] = int(dptr)

            # output allocations for all outputs
            for meta in self.bindings:
                if not meta['is_input']:
                    bidx = meta['index']
                    # resolve shape (dynamic shapes consulted from context)
                    shape = meta['shape']
                    try:
                        # after possible set_binding_shape calls above, context can provide concrete shapes
                        ctx_shape = tuple(self.context.get_binding_shape(bidx))
                        # if ctx_shape contains -1 or 0, fall back to meta['shape'] or 1s
                        if any(int(s) <= 0 for s in ctx_shape):
                            raise ValueError("context shape incomplete")
                        shape = ctx_shape
                    except Exception:
                        if shape is None:
                            # fall back to a conservative 1-element shape
                            shape = (1,)

                    # replace unknown dims with 1
                    shape = tuple(max(1, int(s)) for s in shape)
                    h_out = np.empty(shape, dtype=meta['dtype'])
                    d_out = cuda.mem_alloc(h_out.nbytes)
                    device_ptrs[bidx] = int(d_out)
                    host_outputs[bidx] = (h_out, d_out)

            # prepare bindings list for execution
            bindings = [0] * self.engine.num_bindings
            for i, v in enumerate(device_ptrs):
                bindings[i] = v

            # execute asynchronously
            try:
                # use v2 async if available
                if hasattr(self.context, 'execute_async_v2'):
                    self.context.execute_async_v2(bindings, stream.handle)
                else:
                    # fall back to synchronous execute_v2
                    self.context.execute_v2(bindings)
            except Exception as e:
                raise RuntimeError(f"TensorRT execution failed: {e}")

            # copy outputs back
            results_by_idx = {}
            for bidx, (h_out, d_out) in host_outputs.items():
                cuda.memcpy_dtoh_async(h_out, d_out, stream)
                results_by_idx[bidx] = h_out

            # synchronize stream to ensure copies finished
            stream.synchronize()

            # assemble outputs in engine binding order (ascending index)
            output_indices = [m['index'] for m in self.bindings if not m['is_input']]
            outputs = [results_by_idx[idx] for idx in sorted(output_indices)]

            # return single-array result for single-output engines, else list in binding order
            if len(outputs) == 1:
                return outputs[0]
            return outputs

        except Exception as e:
            logger.warning("PyCUDA inference path failed or PyCUDA not available: %s", e)
            # try cuda-python (nvidia-cuda-python) as a fallback
            try:
                from cuda import driver as cudadriver  # type: ignore
                raise RuntimeError("cuda-python fallback not implemented in this helper")
            except Exception:
                raise RuntimeError("No usable CUDA buffer backend available (install pycuda or implement cuda-python fallback)")


def build_engine(onnx_path: str, engine_path: str, max_workspace_size: int = 1 << 30, fp16: bool = False):
    """Build a TensorRT engine from an ONNX model.

    This function requires the `tensorrt` Python bindings. It is intentionally
    small and suitable for small models; for production use consider adding
    more robust error handling and builder flags.
    """
    if not HAS_TRT:
        raise RuntimeError("tensorrt Python bindings are required to build TRT engines")

    TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
    logger.info("Building TRT engine from %s -> %s", onnx_path, engine_path)
    logger.debug("fp16=%s max_workspace=%d", fp16, int(max_workspace_size))

    # create builder, network, and parser
    builder = trt.Builder(TRT_LOGGER)
    network_flags = 1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH)
    network = builder.create_network(network_flags)
    parser = trt.OnnxParser(network, TRT_LOGGER)

    # parse ONNX model bytes and report parser errors if any
    with open(onnx_path, "rb") as f:
        model_bytes = f.read()
    if not parser.parse(model_bytes):
        # collect parser errors for diagnostics
        errs = []
        # Some TRT versions expose parser.num_errors/get_error
        try:
            n = parser.num_errors
            for i in range(n):
                err = parser.get_error(i)
                errs.append(str(err))
        except Exception:
            # fallback: try to access parser.errors or leave generic
            errs.append("Unknown ONNX parser error")
        logger.error("ONNX parsing failed: %s", errs)
        raise RuntimeError(f"Failed to parse ONNX model: {onnx_path}; errors={errs}")

    config = builder.create_builder_config()
    # ensure int type for workspace
    config.max_workspace_size = int(max_workspace_size)
    if fp16:
        try:
            config.set_flag(trt.BuilderFlag.FP16)
        except Exception:
            logger.warning("FP16 flag not available on this TensorRT build; continuing without FP16")

    # build engine
    engine = builder.build_engine(network, config)
    if engine is None:
        raise RuntimeError("TensorRT engine build returned None (check logs for details)")

    # serialize engine to disk
    with open(engine_path, "wb") as f:
        f.write(engine.serialize())
    logger.info("Engine written to %s", engine_path)
    return engine_path
