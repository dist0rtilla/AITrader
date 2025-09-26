Pattern Engine (TensorRT prototype)
=================================

This folder contains a minimal, guarded prototype that demonstrates how a
pattern engine might use TensorRT for low-latency inference while maintaining
usable fallbacks when TensorRT/PyCUDA aren't available.

Files:
- `state.py` — EMA, VWAP, Welford incremental state helpers.
- `trt_engine.py` — guarded TensorRT engine loader and minimal builder wrapper.
- `runner.py` — simple tick replay runner that maintains per-symbol state and
  calls a model (TRT engine infer) or a deterministic stub.
- `Dockerfile` — example base image using NVIDIA TensorRT container (note: nvcr access may be required).

Quick test (local):

1. Run the runner without TensorRT (uses stub model):

```bash
python -m pattern_engine.runner --ticks fixtures/sample_ticks.csv
```

2. If you have TensorRT available in your environment, build an engine using
   `scripts/build_trt_engine.py` and then run:

```bash
python -m pattern_engine.runner --ticks fixtures/sample_ticks.csv --model-engine /path/to/model.engine
```

Notes:
- The `TRTEngine.infer` method is a placeholder — to run real TRT engines you
  must implement CUDA buffer binding (pycuda or cuda-python) and manage an
  execution context. The scaffolding and engine builder are present to make
  testing straightforward once the environment has tensorrt and pycuda.

TensorRT container quick-run
---------------------------

If you have access to NVIDIA's TensorRT container, a simple quick test is:

```bash
# build an engine inside the official TRT container
docker run --rm --gpus all -v "$PWD":/workspace -w /workspace nvcr.io/nvidia/tensorrt:23.11-py3 \
  python3 scripts/build_trt_engine.py --onnx models/toy_cnn.onnx --engine models/toy_cnn.engine --max_workspace=256M --fp16

# run the python smoke script (with PYTHONPATH pointing at the repo)
docker run --rm --gpus all -v "$PWD":/workspace -w /workspace -e PYTHONPATH=/workspace nvcr.io/nvidia/tensorrt:23.11-py3 \
  bash -lc "pip3 install --no-cache-dir pycuda numpy || true; python3 scripts/_trt_smoke_cnn.py"
```

This is the recommended path for quick validation because it avoids installing
TensorRT into your own base image and ensures the runtime libraries in the
container match the build-time expectations.
