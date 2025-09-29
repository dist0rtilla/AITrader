"""Tiny TensorRT runner skeleton using FastAPI.

This runner expects a serialized TRT engine file (`--engine /models/model.plan`) and
uses pycuda or cuda Python bindings to allocate buffers and execute the engine.

This is a minimal scaffold and includes guard rails when TensorRT or CUDA are not present.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import logging

log = logging.getLogger('tensorrt_runner')
logging.basicConfig(level=logging.INFO)

try:
    import tensorrt as trt  # type: ignore
    import pycuda.autoinit  # type: ignore
    import pycuda.driver as cuda  # type: ignore
    HAS_TRT = True
except Exception as e:
    HAS_TRT = False
    log.warning('TensorRT/PyCUDA not available: %s', e)

app = FastAPI()

class InferReq(BaseModel):
    window: list

ENGINE_PATH = os.environ.get('TRT_ENGINE_PATH', '/models/model.plan')

@app.on_event('startup')
def startup():
    if not HAS_TRT:
        log.warning('TensorRT not available, runner will not function until TRT is installed')
        return
    if not os.path.exists(ENGINE_PATH):
        log.warning('Engine file not found at %s', ENGINE_PATH)
        return
    log.info('TensorRT runner ready (engine=%s)', ENGINE_PATH)

@app.get('/health')
def health():
    """Health check endpoint - returns service health status"""
    return {'status': 'healthy', 'service': 'tensorrt_runner'}

@app.get('/ready')
def ready():
    """Readiness check endpoint - returns if service is ready to serve requests"""
    return {'status': 'ready', 'service': 'tensorrt_runner', 'has_tensorrt': HAS_TRT}

@app.get('/metrics')
def metrics():
    """Metrics endpoint - returns service metrics in Prometheus format"""
    return {'service': 'tensorrt_runner', 'has_tensorrt': HAS_TRT, 'engine_path': ENGINE_PATH}

@app.post('/infer')
def infer(req: InferReq):
    if not HAS_TRT:
        raise HTTPException(status_code=500, detail='TensorRT not available in this environment')
    # Placeholder: real inference requires engine deserialize + buffer management
    return {'detail': 'Not implemented in scaffold; see scripts/build_trt_engine.py to create an engine.'}
