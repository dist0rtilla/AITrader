from pathlib import Path
import importlib.util


def load_module():
    path = Path(__file__).parent.parent / 'pattern_engine' / 'trt_engine.py'
    spec = importlib.util.spec_from_file_location('pattern_engine.trt_engine', str(path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_trt_engine_interface_present():
    mod = load_module()
    assert hasattr(mod, 'TRTEngine'), 'TRTEngine class should be present'
    assert hasattr(mod, 'build_engine'), 'build_engine function should be present'
    # TRTEngine should define infer (even if it requires real TRT to run)
    assert hasattr(mod.TRTEngine, 'infer'), 'TRTEngine.infer should be defined'
