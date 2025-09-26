#!/usr/bin/env bash
set -euo pipefail

LOG=/tmp/onnx_runner.log
PIDFILE=/tmp/onnx_runner.pid

echo "[entrypoint] $(date -u +%FT%TZ) starting ONNXRunner" | tee -a "$LOG"
python3 - <<'PY' >>"$LOG" 2>&1
import sys, json
try:
    import onnxruntime as ort
    print('python exe:', sys.executable)
    print('onnxruntime version:', getattr(ort, '__version__', None))
    provs = ort.get_all_providers()
    print('available providers:', provs)
    # attempt to create a small session to check provider availability
    try:
        sess = ort.InferenceSession('${ONNX_MODEL_PATH:-/models/toy_cnn.onnx}', providers=['CUDAExecutionProvider','CPUExecutionProvider'])
        print('session providers:', getattr(sess, 'get_providers', lambda: None)())
    except Exception as e:
        print('session creation failed with:', repr(e))
except Exception as e:
    print('failed to import onnxruntime or query providers:', repr(e))
    raise
PY

# write pid
echo $$ > "$PIDFILE"
chmod 644 "$PIDFILE"

# exec uvicorn (replace shell with process)
exec uvicorn pattern_engine.onnx_runner:app --host ${ONNX_RUNNER_HOST:-0.0.0.0} --port ${ONNX_RUNNER_PORT:-8001} --log-level info
