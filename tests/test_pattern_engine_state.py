import math
from pattern_engine.state import EMA, VWAP, Welford


def test_ema():
    e = EMA(0.5)
    assert e.update(10.0) == 10.0
    v = e.update(12.0)
    # next value should be 0.5*12 + 0.5*10 = 11.0
    assert abs(v - 11.0) < 1e-6


def test_vwap():
    v = VWAP()
    assert v.update(100.0, 10) == 100.0
    assert v.update(110.0, 10) == 105.0


def test_welford():
    w = Welford()
    data = [1.0, 2.0, 3.0, 4.0]
    for x in data:
        w.update(x)
    # mean should be 2.5
    assert abs(w.mean - 2.5) < 1e-9
    # variance sample is 1.666666...
    assert abs(w.variance - 1.6666666666666667) < 1e-9
    assert math.isclose(w.std, w.variance ** 0.5)
