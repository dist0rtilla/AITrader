# TensorRT Integration Guide

This guide covers TensorRT integration for ultra-low latency inference in the AITrader Pattern Engine.

## 🚀 Overview

TensorRT provides GPU-accelerated inference with significant performance improvements over standard ONNX Runtime. This is particularly valuable for high-frequency trading scenarios where microsecond-level latencies matter.

### Performance Benefits
- **2-5x faster inference** compared to ONNX Runtime CUDA
- **Lower memory usage** through layer fusion and precision optimization
- **Consistent low latency** with optimized CUDA kernels

### When to Use TensorRT
- ✅ **High-frequency trading** with microsecond latency requirements
- ✅ **Production deployments** with dedicated GPU hardware  
- ✅ **Stable model architectures** that don't change frequently
- ❌ **Development/prototyping** where model changes are frequent
- ❌ **CPU-only environments** or shared GPU resources

## 🏗️ Architecture Integration

### Pattern Engine Integration
```python
# pattern_engine/trt_engine.py
class TRTEngine:
    def __init__(self, engine_path: str):
        self.engine = self.load_engine(engine_path)
        self.context = self.engine.create_execution_context()
    
    def infer(self, input_data: np.ndarray) -> np.ndarray:
        # TensorRT inference with CUDA memory management
        return self.execute_inference(input_data)
```

### Fallback Strategy
The system implements automatic fallback:
1. **Primary**: TensorRT engine inference
2. **Fallback**: ONNX Runtime CUDA provider
3. **Emergency**: CPU-based ONNX inference

## 🔧 Setup & Installation

### Prerequisites
- NVIDIA GPU with CUDA 11.8+ or 12.x
- NVIDIA Driver 470+ 
- Docker with NVIDIA Container Toolkit

### Option 1: Docker Development (Recommended)
```bash
# Use NVIDIA's official TensorRT container
docker run --rm --gpus all -v "$PWD":/workspace -w /workspace \\
  nvcr.io/nvidia/tensorrt:23.11-py3 bash

# Inside container, install project dependencies
pip install -r requirements.txt
```

### Option 2: Local Installation
```bash
# Install TensorRT (Ubuntu 22.04)
wget https://developer.nvidia.com/downloads/compute/machine-learning/tensorrt/secure/8.6.1/tars/tensorrt-8.6.1.6.Linux.x86_64-gnu.cuda-12.0.tar.gz
tar -xzf tensorrt-8.6.1.6.Linux.x86_64-gnu.cuda-12.0.tar.gz
export LD_LIBRARY_PATH=$PWD/TensorRT-8.6.1.6/lib:$LD_LIBRARY_PATH

# Install Python bindings
pip install TensorRT-8.6.1.6/python/tensorrt-8.6.1-cp310-none-linux_x86_64.whl
pip install pycuda
```

## 🔨 Model Conversion Pipeline

### Step 1: Export ONNX Model
```bash
# Export PyTorch model to ONNX
python scripts/export_onnx_model.py --model toy_cnn --output models/toy_cnn.onnx
```

### Step 2: Build TensorRT Engine
```bash
# Build optimized TensorRT engine
python scripts/build_trt_engine.py \\
  --onnx models/toy_cnn.onnx \\
  --engine models/toy_cnn.engine \\
  --max_workspace=256M \\
  --fp16 \\
  --int8  # Optional: requires calibration dataset
```

### Step 3: Validate Engine
```bash
# Test engine inference
python scripts/_trt_smoke_cnn.py
```

## ⚡ Performance Optimization

### Engine Build Options
```python
# High-performance trading configuration
config = builder.create_builder_config()
config.max_workspace_size = 256 * 1024 * 1024  # 256MB
config.set_flag(trt.BuilderFlag.FP16)  # Half precision
config.set_flag(trt.BuilderFlag.STRICT_TYPES)  # Consistent precision
```

### Precision Modes
- **FP32**: Default precision, most compatible
- **FP16**: 2x speed improvement, minimal accuracy loss
- **INT8**: 4x speed improvement, requires calibration

### Memory Management
```python
# Optimal CUDA memory allocation
class TRTInference:
    def __init__(self):
        self.cuda_ctx = cuda.Device(0).make_context()
        self.stream = cuda.Stream()
        
    def allocate_buffers(self):
        # Pre-allocate GPU memory for consistent latency
        self.d_input = cuda.mem_alloc(input_size)
        self.d_output = cuda.mem_alloc(output_size)
```

## 🧪 Testing & Validation

### Smoke Tests
```bash
# Basic TensorRT functionality
python scripts/_trt_smoke.py

# CNN model inference test
python scripts/_trt_smoke_cnn.py

# Performance benchmark
python scripts/benchmark_trt_vs_onnx.py
```

### Integration Testing
```bash
# Test TRT vs CPU comparison (requires TRT_CI=1)
export TRT_CI=1
pytest tests/test_trt_vs_cpu.py -v
```

### Performance Validation
```python
# Latency measurement
import time
import numpy as np

def benchmark_inference(engine, num_iterations=1000):
    latencies = []
    for _ in range(num_iterations):
        start = time.perf_counter()
        output = engine.infer(input_data)
        end = time.perf_counter()
        latencies.append((end - start) * 1000)  # Convert to ms
    
    return {
        'mean_latency_ms': np.mean(latencies),
        'p95_latency_ms': np.percentile(latencies, 95),
        'p99_latency_ms': np.percentile(latencies, 99)
    }
```

## 🐳 Docker Integration

### Development Container
```dockerfile
# Dockerfile.tensorrt
FROM nvcr.io/nvidia/tensorrt:23.11-py3

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "pattern_engine/runner.py"]
```

### Production Deployment
```yaml
# docker-compose.gpu.yml
services:
  pattern-engine:
    build:
      context: .
      dockerfile: Dockerfile.tensorrt
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## 🚨 Troubleshooting

### Common Issues

#### CUDA Out of Memory
```bash
# Solution: Reduce batch size or use smaller workspace
config.max_workspace_size = 128 * 1024 * 1024  # Reduce to 128MB
```

#### Engine Build Failures
```bash
# Check ONNX model compatibility
python -c "import onnx; model = onnx.load('model.onnx'); onnx.checker.check_model(model)"

# Verify CUDA/TensorRT versions
nvidia-smi
python -c "import tensorrt; print(tensorrt.__version__)"
```

#### Runtime Errors
```python
# Enable verbose logging
import tensorrt as trt
logger = trt.Logger(trt.Logger.VERBOSE)
```

### Performance Issues
- **Slow first inference**: Expected due to CUDA context initialization
- **Inconsistent latency**: Check GPU memory pressure and thermal throttling
- **Lower than expected performance**: Verify FP16/INT8 optimization enabled

## 📊 Performance Benchmarks

### Typical Performance Gains
| Model Type | ONNX CPU | ONNX CUDA | TensorRT FP32 | TensorRT FP16 |
|------------|----------|-----------|---------------|---------------|
| CNN (small) | 15ms | 3ms | 2ms | 1ms |
| CNN (large) | 45ms | 8ms | 4ms | 2ms |
| MLP | 5ms | 1ms | 0.5ms | 0.3ms |

### Production Metrics
- **Target latency**: <1ms p99 for pattern detection
- **Throughput**: 10,000+ inferences/second
- **Memory usage**: <512MB GPU memory per engine

## 🔄 CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/tensorrt.yml
name: TensorRT CI
on:
  workflow_dispatch:  # Manual trigger

jobs:
  tensorrt-test:
    runs-on: [self-hosted, gpu]
    steps:
      - uses: actions/checkout@v4
      - name: Build TensorRT Engine
        run: |
          docker run --rm --gpus all -v $PWD:/workspace \\
            nvcr.io/nvidia/tensorrt:23.11-py3 \\
            python scripts/build_trt_engine.py --onnx models/toy_cnn.onnx
```

### Deployment Pipeline
1. **Model Training**: Train PyTorch models
2. **ONNX Export**: Convert to ONNX format
3. **Engine Build**: Create TensorRT engines
4. **Validation**: Run smoke tests and benchmarks
5. **Deployment**: Deploy to production with fallback

## 📚 Additional Resources

### Official Documentation
- [TensorRT Developer Guide](https://docs.nvidia.com/deeplearning/tensorrt/developer-guide/)
- [TensorRT Python API](https://docs.nvidia.com/deeplearning/tensorrt/api/python_api/)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)

### AITrader Integration
- [Pattern Engine README](../../pattern_engine/README.md)
- [GPU Setup Guide](../development/GPU_SETUP.md)
- [Performance Testing](../../tests/test_trt_vs_cpu.py)

### Community Resources  
- [TensorRT GitHub Examples](https://github.com/NVIDIA/TensorRT)
- [ONNX Model Zoo](https://github.com/onnx/models)
- [CUDA Best Practices](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/)

---

**Note**: TensorRT integration is optional and primarily beneficial for production high-frequency trading deployments. For development and prototyping, standard ONNX Runtime provides sufficient performance with easier setup.