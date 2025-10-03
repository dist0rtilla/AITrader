"""Indicator helpers for the Strategy Engine.

Provides a simple, dependency-free IndicatorStore that maintains recent price
series per-symbol and exposes common indicators used by trading strategies:
- SMA (simple moving average)
- EMA (exponential moving average)
- RSI (relative strength index)
- Bollinger Bands (middle SMA, upper/lower bands)
- ATR (average true range) -- requires tick dicts with high/low/close optionally

The implementation is intentionally small and easy to test. For production
use you'll want to replace or optimize these with vectorized numpy/pandas
implementations or call a specialized C extension.
"""
from collections import deque, defaultdict
from typing import Deque, Dict, List, Optional, Tuple
import math


class IndicatorStore:
    """Stores recent price windows per symbol and computes indicators.

    Usage:
        store = IndicatorStore(maxlen=256)
        store.update({'symbol':'ABC','price':123.4, 'high': 124.0, 'low':122.0, 'close':123.4})
        sma10 = store.sma('ABC', 10)
    """

    def __init__(self, maxlen: int = 512):
        self.maxlen = maxlen
        self.prices: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=self.maxlen))
        # For ATR we track high/low/close history
        self.highs: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=self.maxlen))
        self.lows: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=self.maxlen))
        self.closes: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=self.maxlen))

    def update(self, tick: dict):
        """Update store with a tick dict. Must contain 'symbol' and 'price'.

        Optionally, provide 'high', 'low', 'close' for ATR.
        """
        sym = tick.get('symbol')
        if not sym or 'price' not in tick:
            return
        price = float(tick['price'])
        self.prices[sym].append(price)
        if 'high' in tick and 'low' in tick and 'close' in tick:
            self.highs[sym].append(float(tick['high']))
            self.lows[sym].append(float(tick['low']))
            self.closes[sym].append(float(tick['close']))
        else:
            # Keep closes in sync for very basic ATR usage
            self.closes[sym].append(price)

    def _get_window(self, sym: str, n: int) -> List[float]:
        seq = self.prices.get(sym)
        if not seq or len(seq) == 0:
            return []
        return list(seq)[-n:]

    def sma(self, sym: str, n: int) -> Optional[float]:
        w = self._get_window(sym, n)
        if len(w) < n:
            return None
        return sum(w) / float(len(w))

    def ema(self, sym: str, n: int) -> Optional[float]:
        w = self._get_window(sym, n)
        if len(w) < n:
            return None
        # classic EMA init: start with SMA of first window then apply smoothing
        alpha = 2.0 / (n + 1)
        ema = float(w[0:n][0]) if len(w) >= n else w[0]
        # compute EMA over window
        ema = sum(w[:n]) / n
        for price in w[n:]:
            ema = price * alpha + ema * (1 - alpha)
        return ema

    def rsi(self, sym: str, n: int) -> Optional[float]:
        w = self._get_window(sym, n + 1)
        if len(w) < n + 1:
            return None
        gains = 0.0
        losses = 0.0
        for i in range(1, len(w)):
            diff = w[i] - w[i - 1]
            if diff > 0:
                gains += diff
            else:
                losses += -diff
        avg_gain = gains / n
        avg_loss = losses / n
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100.0 - (100.0 / (1.0 + rs))

    def bollinger(self, sym: str, n: int = 20, k: float = 2.0) -> Optional[Tuple[float, float, float]]:
        w = self._get_window(sym, n)
        if len(w) < n:
            return None
        mean = sum(w) / n
        var = sum((x - mean) ** 2 for x in w) / n
        std = math.sqrt(var)
        upper = mean + k * std
        lower = mean - k * std
        return mean, upper, lower

    def atr(self, sym: str, n: int = 14) -> Optional[float]:
        highs = self.highs.get(sym)
        lows = self.lows.get(sym)
        closes = self.closes.get(sym)
        if not highs or len(highs) < n or not lows or len(lows) < n or not closes or len(closes) < n:
            return None
        tr_list: List[float] = []
        for i in range(1, n):
            high = highs[-i]
            low = lows[-i]
            prev_close = closes[-i - 1]
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            tr_list.append(tr)
        if not tr_list:
            return None
        return sum(tr_list) / len(tr_list)

 
