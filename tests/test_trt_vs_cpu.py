import os
import numpy as np
import importlib.util
import os
import numpy as np
import importlib.util
from pathlib import Path
import pytest

try:
    import onnxruntime as ort  # type: ignore
    HAS_ORT = True
except Exception:
    HAS_ORT = False


def load_module():
    path = Path(__file__).parent.parent / 'pattern_engine' / 'trt_engine.py'
    spec = importlib.util.spec_from_file_location('pattern_engine.trt_engine', str(path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.mark.skipif(not HAS_ORT, reason="onnxruntime not available")
def test_trt_matches_cpu_mlp(tmp_path):
    """Run a CPU ONNXRuntime inference and compare to TRT engine output if available.

    This test is safe to run on CI without GPUs — it will always run the CPU
    ONNXRuntime baseline. TRT comparison runs only when TRT_CI=1 is set and the
    engine file and runtime are present.
    """
    repo_root = Path(__file__).parent.parent
    onnx_path = repo_root / 'models' / 'toy_mlp.onnx'
    assert onnx_path.exists(), "ONNX model toy_mlp.onnx must be present in models/"

    # Prepare a deterministic input
    input_data = np.zeros((1, 1, 32), dtype=np.float32)

    # CPU baseline
    sess = ort.InferenceSession(str(onnx_path), providers=['CPUExecutionProvider'])
    input_name = sess.get_inputs()[0].name
    cpu_out = sess.run(None, {input_name: input_data})

    # If TRT CI is enabled and engine exists, compare
    if os.environ.get('TRT_CI') == '1':
        engine_path = repo_root / 'models' / 'toy_mlp.engine'
        if not engine_path.exists():
            pytest.skip('TRT engine missing; skip TRT comparison')
        mod = load_module()
        if not mod.has_tensorrt():
            pytest.skip('tensorrt not available in this environment')
        trt = mod.TRTEngine(str(engine_path))
        trt_out = trt.infer(input_data)
        # Normalize outputs to numpy arrays/lists
        if isinstance(trt_out, list):
            trt_out = [np.asarray(x) for x in trt_out]
        else:
            trt_out = np.asarray(trt_out)

        # Compare shapes
        if isinstance(cpu_out, list):
            cpu_out_arr = [np.asarray(x) for x in cpu_out]
        else:
            cpu_out_arr = np.asarray(cpu_out)

        # simple comparison: shapes equal and numeric close
        if isinstance(cpu_out_arr, list):
            assert len(cpu_out_arr) == len(trt_out)
            for c, t in zip(cpu_out_arr, trt_out):
                assert c.shape == t.shape
                assert np.allclose(c, t, atol=1e-4, rtol=1e-3)
        else:
            assert cpu_out_arr.shape == trt_out.shape
            assert np.allclose(cpu_out_arr, trt_out, atol=1e-4, rtol=1e-3)