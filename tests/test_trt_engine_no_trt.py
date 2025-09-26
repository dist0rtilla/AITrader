import importlib.util
import sys
from pathlib import Path


def load_trt_engine_module():
    path = Path(__file__).parent.parent / 'pattern_engine' / 'trt_engine.py'
    spec = importlib.util.spec_from_file_location('pattern_engine.trt_engine', str(path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_build_engine_raises_when_no_trt(monkeypatch):
    # Simulate missing tensorrt binding by removing it from sys.modules
    monkeypatch.setitem(sys.modules, 'tensorrt', None)
    # load the module by file path so import machinery for the package isn't required
    mod = load_trt_engine_module()
    try:
        try:
            mod.build_engine('foo.onnx', 'foo.engine')
            assert False, 'Expected RuntimeError when tensorrt is not available'
        except RuntimeError as e:
            assert 'tensorrt' in str(e).lower()
    finally:
        # no cleanup needed; test process will exit
        pass
