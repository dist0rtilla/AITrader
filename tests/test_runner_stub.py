from pattern_engine.runner import default_model_stub


def test_default_model_stub_range():
    # empty-ish input should not crash and must return a float in [-1,1]
    val = default_model_stub([0.0, 0.0, 0.0])
    assert isinstance(val, float)
    assert -1.0 <= val <= 1.0


def test_default_model_stub_scaling():
    # ensure clamping works
    val = default_model_stub([1000.0, 1000.0])
    assert val <= 1.0
    val2 = default_model_stub([-1000.0, -1000.0])
    assert val2 >= -1.0
