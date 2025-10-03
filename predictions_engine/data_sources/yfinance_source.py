from typing import List

import pandas as pd
import yfinance as yf

from .base import MarketDataSource


class YFinanceSource(MarketDataSource):
    async def get_history(self, symbol: str, points: int = 120, interval: str = "1m") -> List[float]:
        # yfinance is sync; run simply in current thread (fast for small pulls)
        # For production, consider aiohttp or caching layer.
        data = yf.download(
            tickers=symbol,
            period="5d" if interval.endswith("m") else "1mo",
            interval=interval,
            progress=False,
            auto_adjust=True,
        )
        if not isinstance(data, pd.DataFrame) or data.empty:
            return []
        # use Close prices, take last `points`
        values = data["Close"].astype(float).tolist()
        return values[-points:]

