from abc import ABC, abstractmethod
from typing import List


class MarketDataSource(ABC):
    @abstractmethod
    async def get_history(self, symbol: str, points: int = 120, interval: str = "1m") -> List[float]:
        """Return latest price series of length `points` at `interval` resolution.
        Values should be aligned oldest→newest.
        """
        raise NotImplementedError

