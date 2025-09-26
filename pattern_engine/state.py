"""Per-symbol incremental state helpers.

Includes:
- EMA: exponential moving average
- VWAP: incremental vwap accumulator
- Welford: online variance/mean

These are small, well-tested algorithms suitable for the pattern engine.
"""
from typing import Optional


class EMA:
    def __init__(self, alpha: float):
        assert 0.0 < alpha <= 1.0
        self.alpha = float(alpha)
        self.value: Optional[float] = None

    def update(self, x: float) -> float:
        if self.value is None:
            self.value = float(x)
        else:
            self.value = self.alpha * float(x) + (1 - self.alpha) * self.value
        return self.value


class VWAP:
    def __init__(self):
        self._pv = 0.0
        self._volume = 0.0

    def update(self, price: float, volume: float) -> float:
        self._pv += float(price) * float(volume)
        self._volume += float(volume)
        if self._volume == 0:
            return 0.0
        return self._pv / self._volume


class Welford:
    def __init__(self):
        self.count = 0
        self.mean = 0.0
        self.m2 = 0.0

    def update(self, x: float):
        self.count += 1
        delta = x - self.mean
        self.mean += delta / self.count
        delta2 = x - self.mean
        self.m2 += delta * delta2

    @property
    def variance(self) -> float:
        if self.count < 2:
            return 0.0
        return self.m2 / (self.count - 1)

    @property
    def std(self) -> float:
        return self.variance ** 0.5
