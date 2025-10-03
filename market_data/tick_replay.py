import asyncio
import os
import time
from typing import List

import redis
import yfinance as yf


REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
TICKS_STREAM = os.environ.get('TICKS_STREAM', 'ticks:global')
SYMBOLS = [s for s in os.environ.get('REPLAY_SYMBOLS', 'AAPL,MSFT,GOOGL').split(',') if s]
INTERVAL = os.environ.get('REPLAY_INTERVAL', '1m')  # yfinance interval
SLEEP_SECONDS = int(os.environ.get('REPLAY_SLEEP_SECONDS', '60'))


async def fetch_latest_bars(symbol: str, interval: str = '1m', points: int = 1):
    data = yf.download(tickers=symbol, period='1d', interval=interval, progress=False, auto_adjust=True)
    if data is None or data.empty:
        return []
    tail = data.tail(points)
    out = []
    for ts, row in tail.iterrows():
        out.append({
            'symbol': symbol,
            'price': float(row['Close']),
            'volume': float(row.get('Volume', 0.0) or 0.0),
            'timestamp': ts.timestamp()
        })
    return out


async def main():
    r = redis.from_url(REDIS_URL, decode_responses=True)
    while True:
        start = time.time()
        for sym in SYMBOLS:
            try:
                bars = await fetch_latest_bars(sym, INTERVAL, points=1)
                for bar in bars:
                    r.xadd(TICKS_STREAM, bar)
            except Exception as e:
                # ignore single-symbol errors
                pass
        elapsed = time.time() - start
        await asyncio.sleep(max(0, SLEEP_SECONDS - int(elapsed)))


if __name__ == '__main__':
    asyncio.run(main())

