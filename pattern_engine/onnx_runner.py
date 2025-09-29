"""ONNXRunner: loads an ONNX model and exposes a tiny HTTP inference endpoint.

Usage:
  # TCP mode
  REDIS_URL=... ONNX_MODEL_PATH=models/toy_cnn.onnx python -m pattern_engine.onnx_runner

  # UDS mode (uvicorn supports --uds argument; this script also supports UDS path via env var):
  UDS_PATH=/tmp/onnx.sock python -m pattern_engine.onnx_runner

The service accepts POST /infer with JSON body:
  {"window": [float, ...]}
and returns:
  {"probs": [..], "output": [...]}.

This is intentionally minimal; for production use prefer gRPC or compiled runners.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import numpy as np
import json
import logging

ort = None

MODEL_PATH = os.environ.get('ONNX_MODEL_PATH', 'models/toy_cnn.onnx')
APP_HOST = os.environ.get('ONNX_RUNNER_HOST', '0.0.0.0')
APP_PORT = int(os.environ.get('ONNX_RUNNER_PORT', '8080'))
UDS_PATH = os.environ.get('UDS_PATH', '')

log = logging.getLogger('onnx_runner')
logging.basicConfig(level=logging.INFO)

app = FastAPI()

class InferRequest(BaseModel):
    window: list

_session = None
_input_name = None
_output_name = None
_model_shape = None


def init_onnx_session():
    """Initialize the ONNX InferenceSession lazily.

    This function will attempt to import `onnxruntime` and create an
    InferenceSession using a sequence of provider variants (CUDA/Trt/CPU),
    falling back to CPU if needed. It is safe to call multiple times.
    """
    global ort, _session, _input_name, _output_name, _model_shape

    if _session is not None:
        return _session

    try:
        import onnxruntime as ort  # type: ignore
    except Exception:
        log.warning('onnxruntime not installed; ONNXRunner will not function until onnxruntime is installed')
        ort = None
        return None

    # log available providers to help diagnose GPU vs CPU provider availability
    try:
        provs = ort.get_all_providers()
        log.info('onnxruntime available providers: %s', provs)
    except Exception as _e:
        log.warning('failed to query onnxruntime providers: %s', _e)

    if not os.path.exists(MODEL_PATH):
        log.warning('ONNX model not found at %s', MODEL_PATH)
        return None

    cuda_dev = int(os.environ.get('CUDA_DEVICE', '0'))

    def try_session_with_variants(model_path):
        use_trt = os.environ.get('USE_TENSORRT', '') in ('1', 'true', 'True')
        variants = []
        if use_trt:
            variants.append([( 'TensorrtExecutionProvider', {} ), ( 'CUDAExecutionProvider', {'device_id': cuda_dev} ), 'CPUExecutionProvider'])
            variants.append([( 'TensorrtExecutionProvider', {} ), 'CPUExecutionProvider'])
        variants.extend([
            [( 'CUDAExecutionProvider', {'device_id': cuda_dev} ), 'CPUExecutionProvider'],
            [( 'CUDAExecutionProvider', {'device_id': cuda_dev, 'cudnn_conv_algo_search': 'HEURISTIC'}), 'CPUExecutionProvider'],
            [( 'CUDAExecutionProvider', {'device_id': cuda_dev, 'cudnn_conv_algo_search': 'EXHAUSTIVE'}), 'CPUExecutionProvider'],
            [( 'CUDAExecutionProvider', {'device_id': cuda_dev, 'do_copy_in_default_stream': '1'}), 'CPUExecutionProvider'],
            ['CPUExecutionProvider']
        ])
        last_exc = None
        for variant in variants:
            try:
                log.info('Attempting InferenceSession with providers=%s', variant)
                sess = ort.InferenceSession(model_path, providers=variant)
                try:
                    active = getattr(sess, 'get_providers', lambda: None)()
                except Exception:
                    active = None
                log.info('Session created, active providers=%s', active)
                return sess, variant, active
            except Exception as e:
                last_exc = e
                log.warning('Session creation failed for providers=%s: %s', variant, e)
                continue
        if last_exc:
            raise last_exc
        return None, None, None

    try:
        sess, used_variant, active = try_session_with_variants(MODEL_PATH)
        if sess is None:
            raise RuntimeError('Failed to create any ONNX session')

        _session = sess
        inputs = sess.get_inputs()
        outputs = sess.get_outputs()
        if len(inputs) > 0:
            _input_name = inputs[0].name
            _model_shape = tuple(dim if isinstance(dim, int) else -1 for dim in inputs[0].shape)
        if len(outputs) > 0:
            _output_name = outputs[0].name
        log.info('Loaded ONNX model %s requested_providers=%s active_providers=%s input=%s output=%s shape=%s', MODEL_PATH, used_variant, active, _input_name, _output_name, _model_shape)
        return _session
    except Exception as e:
        try:
            log.warning('All CUDA session attempts failed, falling back to CPUExecutionProvider: %s', e)
            sess = ort.InferenceSession(MODEL_PATH, providers=['CPUExecutionProvider'])
            _session = sess
            inputs = sess.get_inputs()
            outputs = sess.get_outputs()
            if len(inputs) > 0:
                _input_name = inputs[0].name
                _model_shape = tuple(dim if isinstance(dim, int) else -1 for dim in inputs[0].shape)
            if len(outputs) > 0:
                _output_name = outputs[0].name
            try:
                active = getattr(sess, 'get_providers', lambda: None)()
            except Exception:
                active = None
            log.info('Loaded ONNX model %s (CPU fallback) active_providers=%s input=%s output=%s shape=%s', MODEL_PATH, active, _input_name, _output_name, _model_shape)
            return _session
        except Exception as e2:
            log.exception('Failed to load ONNX model: %s ; %s', e, e2)
            _session = None
            return None

@app.post('/infer')
async def infer(req: InferRequest):
    # ensure session is initialized lazily
    if _session is None:
        init_onnx_session()
    if _session is None:
        raise HTTPException(status_code=500, detail='ONNX session not initialized')
    arr = np.array(req.window, dtype=np.float32)
    # guess expected shape: model likely expects [1,1,WINDOW]
    if arr.ndim == 1:
        arr = arr.reshape(1, 1, -1)
    elif arr.ndim == 2:
        # if shape (1, N) -> make (1,1,N)
        if arr.shape[0] == 1:
            arr = arr.reshape(1, 1, arr.shape[1])
    # ensure float32
    arr = arr.astype(np.float32)
    try:
        inputs = { _input_name: arr }
        out = _session.run(None, inputs)
        # convert outputs to python lists
        out_py = [o.tolist() for o in out]
        return { 'probs': out_py[0] if len(out_py)>0 else None, 'output': out_py }
    except Exception as e:
        # detect common cuDNN/CUDA backend failures and retry on CPU
        msg = str(e)
        log.exception('Inference failed: %s', e)
        if 'CUDNN' in msg or 'CUDNN_FE' in msg or 'CUDNN_BACKEND_API_FAILED' in msg or 'CUDA' in msg:
            log.warning('Detected GPU/cuDNN failure, retrying inference on CPU')
            try:
                # create a temporary CPU session if not already cached
                cpu_sess = None
                try:
                    cpu_sess = ort.InferenceSession(MODEL_PATH, providers=['CPUExecutionProvider'])
                except Exception as e2:
                    log.exception('Failed to create CPU session for fallback: %s', e2)
                    raise HTTPException(status_code=500, detail=str(e))
                try:
                    out = cpu_sess.run(None, {_input_name: arr})
                    out_py = [o.tolist() for o in out]
                    return { 'probs': out_py[0] if len(out_py)>0 else None, 'output': out_py, 'fallback': 'cpu' }
                except Exception as e3:
                    log.exception('CPU fallback inference also failed: %s', e3)
                    raise HTTPException(status_code=500, detail=str(e3))
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/model/status')
def model_status():
    info = {'model_path': MODEL_PATH, 'onnx_providers': [], 'onnx_provider_in_session': None}
    try:
        # try to initialize ort lazily to collect provider info
        init_onnx_session()
        if 'ort' in globals() and ort is not None:
            try:
                info['onnx_providers'] = ort.get_all_providers()
            except Exception:
                info['onnx_providers'] = []
            # try to inspect session for provider
            if _session is not None:
                try:
                    info['onnx_provider_in_session'] = getattr(_session, 'get_providers', lambda: None)()
                except Exception:
                    info['onnx_provider_in_session'] = None
    except Exception as e:
        info['error'] = str(e)
    return info

if __name__ == '__main__':
    import uvicorn
    # initialize ONNX session lazily at startup (if possible)
    try:
        init_onnx_session()
    except Exception:
        log.exception('ONNX session initialization at startup failed')

    if UDS_PATH:
        log.info('Starting ONNXRunner on UDS %s', UDS_PATH)
        # uvicorn supports --uds, but programmatic run doesn't expose uds param in runner API prior to recent versions.
        # fallback: spawn uvicorn via CLI
        os.execvp('uvicorn', ['uvicorn', 'pattern_engine.onnx_runner:app', '--uds', UDS_PATH, '--log-level', 'info'])
    else:
        log.info('Starting ONNXRunner on %s:%d', APP_HOST, APP_PORT)
        uvicorn.run('pattern_engine.onnx_runner:app', host=APP_HOST, port=APP_PORT, log_level='info')
