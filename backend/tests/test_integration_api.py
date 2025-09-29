import json
import os
import socket
import subprocess
import time
from urllib.request import urlopen


def _find_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 0))
    addr, port = s.getsockname()
    s.close()
    return port


def _wait_for(url: str, timeout: float = 5.0) -> str:
    deadline = time.time() + timeout
    last_exc = None
    while time.time() < deadline:
        try:
            with urlopen(url, timeout=1) as r:
                return r.read().decode('utf-8')
        except Exception as e:
            last_exc = e
            time.sleep(0.1)
    raise RuntimeError(f"service at {url} not ready: {last_exc}")


def test_api_status_and_metrics_shape(tmp_path):
    port = _find_free_port()
    env = os.environ.copy()
    # Ensure the repository root is on PYTHONPATH so `backend` can be imported
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    env['PYTHONPATH'] = os.pathsep.join([repo_root, env.get('PYTHONPATH', '')])

    # Start uvicorn as a subprocess running backend.main:app
    cmd = [
        env.get('PYTHON', 'python3'),
        '-m', 'uvicorn',
        'backend.main:app',
        '--host', '127.0.0.1',
        '--port', str(port),
        '--log-level', 'warning',
    ]

    stdout_path = tmp_path / 'uvicorn.out'
    stderr_path = tmp_path / 'uvicorn.err'
    with open(stdout_path, 'wb') as sout, open(stderr_path, 'wb') as serr:
        proc = subprocess.Popen(cmd, env=env, stdout=sout, stderr=serr)
    try:
        base = f'http://127.0.0.1:{port}'

        # Wait for TCP port to accept connections
        deadline = time.time() + 15.0
        connected = False
        while time.time() < deadline:
            if proc.poll() is not None:
                raise RuntimeError('uvicorn process exited early')
            try:
                import socket as _socket
                with _socket.create_connection(('127.0.0.1', port), timeout=1):
                    connected = True
                    break
            except Exception:
                time.sleep(0.1)
        if not connected:
            raise RuntimeError(f'port {port} not accepting connections')

        status_raw = _wait_for(f"{base}/api/status", timeout=10.0)
        data = json.loads(status_raw)

        assert 'timestamp' in data
        assert isinstance(data['components'], list)
        # ensure each component has id, name, status
        for c in data['components']:
            assert 'id' in c and 'name' in c and 'status' in c

        # Check metrics endpoint for backend component
        metrics_raw = _wait_for(f"{base}/api/components/backend/metrics", timeout=5.0)
        m = json.loads(metrics_raw)
        assert m.get('component') == 'backend'
        assert 'metrics' in m and isinstance(m['metrics'], dict)
        assert 'timestamp' in m
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        # If the test fails, dump the uvicorn logs to help debugging
        try:
            with open(stdout_path, 'r') as f:
                print('\n--- uvicorn stdout ---')
                print(f.read())
        except Exception:
            pass
        try:
            with open(stderr_path, 'r') as f:
                print('\n--- uvicorn stderr ---')
                print(f.read())
        except Exception:
            pass
