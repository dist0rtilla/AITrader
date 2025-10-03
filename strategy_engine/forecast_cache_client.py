import json
import os
from typing import Any, Dict, Optional

import redis


class ForecastCacheClient:
    def __init__(self, redis_url: Optional[str] = None):
        redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis = redis.from_url(redis_url, decode_responses=True)

    def get_latest(self, symbol: str, horizon: str) -> Optional[Dict[str, Any]]:
        key_snapshot = f"forecasts:{symbol}:{horizon}"
        raw = self._redis.get(key_snapshot)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    def tail_stream(self, symbol: str, count: int = 50):
        stream_key = f"forecasts_stream:{symbol}"
        try:
            items = self._redis.xrevrange(stream_key, count=count)
            decoded = []
            for _id, fields in items:
                data_raw = fields.get("data")
                if data_raw:
                    try:
                        decoded.append(json.loads(data_raw))
                    except Exception:
                        continue
            return decoded
        except Exception:
            return []

