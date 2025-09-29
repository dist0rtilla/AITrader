Pattern Engine (Python Implementation)
======================================

**Current Status:** Fully functional Python implementation with asyncio  
**Future Goal:** Rust migration for ultra-low latency production use

This folder contains the Pattern Engine service that detects short-term micro patterns
and publishes trading signals. The current Python implementation provides full functionality
with optional TensorRT acceleration for GPU inference.

Files:
- `pattern_detector.py` — Main Pattern Engine service with Redis integration
- `state.py` — EMA, VWAP, Welford incremental state helpers.
- `runner.py` — Market data replay and processing engine
- `trt_engine.py` — Optional TensorRT engine loader for GPU acceleration
- `onnx_runner.py` — ONNX model integration for ML-based pattern detection
- `Dockerfile` — Production-ready container image

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
