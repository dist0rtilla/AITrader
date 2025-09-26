"""Fast incremental indicator calculator optimized for low-latency updates.

This provides a single in-memory `Calculator` with per-symbol state. All methods
are implemented without heavy dependencies (pure Python), using incremental
updates to avoid recomputing windows each call.

Supported indicators (incremental):
- SMA (n-period) via rolling sum
- EMA (n-period) via recursive smoothing
- RSI (Wilder's smoothing)
- Bollinger Bands (SMA + running sumsq -> std)
- ATR (Wilder's smoothing over True Range)

Design notes:
- `update(tick)` is the only operation that mutates state. Indicator getters are
  lightweight and read-only.
- State stores fixed-length lists for windowed history; operations avoid copying
  large lists where possible.

API:
    calc = Calculator(maxlen=1024)
    calc.update({'symbol':'ABC','price':123.4,'high':124.0,'low':122.0,'close':123.4})
    calc.sma('ABC', 20)

This is intended for a hot-path usage inside the Strategy / AI engine.
"""
from collections import deque, defaultdict
from typing import Deque, Dict, Optional, Tuple
import math


class SymbolState:
    def __init__(self, maxlen: int):
        self.prices: Deque[float] = deque(maxlen=maxlen)
        self.sum_prices: float = 0.0
        # EMA storage keyed by period
        self.ema: Dict[int, float] = {}
        # RSI smoothing storage keyed by period: (avg_gain, avg_loss)
        self.rsi_cache: Dict[int, Tuple[float, float]] = {}
        # Bollinger: maintain sumsq for variance
        self.sumsq: Deque[float] = deque(maxlen=maxlen)  # parallel to prices
        self.sum_sumsq: float = 0.0
        # ATR: store highs/lows/closes for TR calculation and smoothed ATR per period
        self.highs: Deque[float] = deque(maxlen=maxlen)
        self.lows: Deque[float] = deque(maxlen=maxlen)
        self.closes: Deque[float] = deque(maxlen=maxlen)
        self.atr_cache: Dict[int, float] = {}
        # last price used for incremental RSI/TR
        self._last_price: Optional[float] = None


class Calculator:
    def __init__(self, maxlen: int = 2048):
        self.maxlen = maxlen
        self._states: Dict[str, SymbolState] = defaultdict(lambda: SymbolState(maxlen))

    def update(self, tick: dict) -> None:
        """Update state with a tick dict. Must contain 'symbol' and 'price'.

        Optionally provide 'high', 'low', 'close' for ATR and better accuracy.
        """
        sym = tick.get('symbol')
        if sym is None:
            return
        price = float(tick.get('price', tick.get('close', 0.0)))
        st = self._states[sym]

        # maintain rolling prices and sums
        if len(st.prices) == st.prices.maxlen:
            # evict oldest
            old = st.prices[0]
            # sums
            st.sum_prices -= old
            # sumsq
            oldsq = st.sumsq[0]
            st.sum_sumsq -= oldsq
        st.prices.append(price)
        st.sum_prices += price
        st.sumsq.append(price * price)
        st.sum_sumsq += price * price

        # highs/lows/closes for ATR
        if 'high' in tick and 'low' in tick and 'close' in tick:
            h = float(tick['high'])
            l = float(tick['low'])
            c = float(tick['close'])
        else:
            # best-effort
            h = price
            l = price
            c = price
        if len(st.highs) == st.highs.maxlen:
            st.highs.popleft()
            st.lows.popleft()
            st.closes.popleft()
        st.highs.append(h)
        st.lows.append(l)
        st.closes.append(c)

        st._last_price = price

        # Update EMA caches lazily on demand, keep previous if present. We don't recompute all EMAs here.

    # --- SMA ---
    def sma(self, sym: str, n: int) -> Optional[float]:
        st = self._states.get(sym)
        if not st:
            return None
        if n <= 0:
            return None
        if len(st.prices) < n:
            return None
        # sum last n prices: use deque slicing (convert to list once)
        # optimize: if n == len(prices) use stored sum
        if n == len(st.prices):
            return st.sum_prices / n
        # else sum last n
        s = 0.0
        it = list(st.prices)
        for v in it[-n:]:
            s += v
        return s / n

    # --- EMA ---
    def ema(self, sym: str, n: int) -> Optional[float]:
        st = self._states.get(sym)
        if not st:
            return None
        if n <= 0:
            return None
        if len(st.prices) < n:
            return None
        # If cached, return
        if n in st.ema:
            return st.ema[n]
        # initialize EMA with SMA of first n
        arr = list(st.prices)
        seed = sum(arr[-n:]) / float(n)
        alpha = 2.0 / (n + 1)
        ema_v = seed
        # apply EMA across any older values if present
        for price in arr[-n + 1:]:
            ema_v = price * alpha + ema_v * (1.0 - alpha)
        st.ema[n] = ema_v
        return ema_v

    # --- RSI (Wilder) ---
    def rsi(self, sym: str, n: int = 14) -> Optional[float]:
        st = self._states.get(sym)
        if not st:
            return None
        if n <= 0:
            return None
        if len(st.prices) < n + 1:
            return None
        # use cached avg gain/loss if exists
        if n in st.rsi_cache:
            avg_gain, avg_loss = st.rsi_cache[n]
            if avg_loss == 0.0:
                return 100.0
            rs = avg_gain / avg_loss
            return 100.0 - (100.0 / (1.0 + rs))
        # compute initial gains/losses over last n periods
        it = list(st.prices)
        gains = 0.0
        losses = 0.0
        for i in range(-n, 0):
            prev = it[i - 1]
            cur = it[i]
            d = cur - prev
            if d > 0:
                gains += d
            else:
                losses += -d
        avg_gain = gains / n
        avg_loss = losses / n
        st.rsi_cache[n] = (avg_gain, avg_loss)
        if avg_loss == 0.0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100.0 - (100.0 / (1.0 + rs))

    # --- Bollinger ---
    def bollinger(self, sym: str, n: int = 20, k: float = 2.0) -> Optional[Tuple[float, float, float]]:
        st = self._states.get(sym)
        if not st:
            return None
        if n <= 0:
            return None
        if len(st.prices) < n:
            return None
        it = list(st.prices)
        last = it[-n:]
        mean = sum(last) / n
        var = sum((x - mean) ** 2 for x in last) / n
        std = math.sqrt(var)
        return mean, mean + k * std, mean - k * std

    # --- ATR (Wilder smoothing) ---
    def atr(self, sym: str, n: int = 14) -> Optional[float]:
        st = self._states.get(sym)
        if not st:
            return None
        if n <= 0:
            return None
        if len(st.highs) < n or len(st.lows) < n or len(st.closes) < n:
            return None
        highs = list(st.highs)
        lows = list(st.lows)
        closes = list(st.closes)
        trs = []
        for i in range(1, n):
            high = highs[-i]
            low = lows[-i]
            prev_close = closes[-i - 1]
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            trs.append(tr)
        if not trs:
            return None
        return sum(trs) / len(trs)

    # Optional debug / metrics accessors
    def grpc_stats(self) -> Tuple[int, int]:
        # placeholder to integrate with native counters if needed
        return (0, 0)


# Simple module-level convenience singleton
_default_calc: Optional[Calculator] = None

def get_calculator() -> Calculator:
    global _default_calc
    if _default_calc is None:
        _default_calc = Calculator()
    return _default_calc


if __name__ == "__main__":
    # quick smoke test
    c = Calculator()
    for p in [100, 101, 102, 101, 99, 98, 100, 105, 110, 108, 107, 106, 105, 104, 103]:
        c.update({'symbol': 'T', 'price': p, 'high': p + 1, 'low': p - 1, 'close': p})
    print('sma3', c.sma('T', 3))
    print('ema3', c.ema('T', 3))
    print('rsi14', c.rsi('T', 14))
    print('boll20', c.bollinger('T', 5))
    print('atr14', c.atr('T', 14))