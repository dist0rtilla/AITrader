"""Pattern Engine package (TensorRT prototype)

This package provides a guarded TensorRT-based inference runner and
lightweight per-symbol state (EMA, VWAP, Welford). It is intentionally
minimal and safe to import when `tensorrt`/`pycuda` are not installed.
"""

__all__ = ["state", "trt_engine", "runner"]
# pattern_engine package
