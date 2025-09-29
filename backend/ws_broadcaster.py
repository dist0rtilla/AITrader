import os
import asyncio
import logging
from typing import Set

from fastapi import WebSocket

logger = logging.getLogger("ws_broadcaster")


class WSBroadcaster:
    def __init__(self):
        self._clients: Set[WebSocket] = set()
        self._redis = None
        self._task = None

    async def start(self):
        if self._task:
            return
        # Import aioredis lazily so the app can start even when aioredis
        # isn't installed in lightweight dev environments.
        try:
            import aioredis  # type: ignore
            self._aioredis = aioredis
        except Exception:
            self._aioredis = None
        self._task = asyncio.create_task(self._run())

    async def stop(self):
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _run(self):
        redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')
        backoff = 1
        while True:
            try:
                if not self._aioredis:
                    logger.warning('aioredis not installed; WSBroadcaster will idle')
                    await asyncio.sleep(60)
                    continue
                self._redis = await self._aioredis.from_url(redis_url)
                pubsub = self._redis.pubsub()
                await pubsub.subscribe('signals:global')
                logger.info('WSBroadcaster subscribed to signals:global')
                backoff = 1
                async for message in pubsub.listen():
                    if not message or message.get('type') != 'message':
                        continue
                    data = message.get('data')
                    text = data.decode() if isinstance(data, bytes) else str(data)
                    await self.broadcast_text(text)
            except asyncio.CancelledError:
                logger.info('WSBroadcaster cancelled')
                raise
            except Exception:
                logger.exception('WSBroadcaster error; will retry after backoff')
                try:
                    await asyncio.sleep(backoff)
                except asyncio.CancelledError:
                    raise
                backoff = min(backoff * 2, 30)

    async def add_client(self, ws: WebSocket):
        self._clients.add(ws)

    async def remove_client(self, ws: WebSocket):
        self._clients.discard(ws)

    async def broadcast_json(self, payload: dict):
        # send and remove dead clients
        for c in list(self._clients):
            try:
                await c.send_json(payload)
            except Exception:
                logger.exception('failed to send_json to client; removing')
                self._clients.discard(c)

    async def broadcast_text(self, text: str):
        for c in list(self._clients):
            try:
                await c.send_text(text)
            except Exception:
                logger.exception('failed to send_text to client; removing')
                self._clients.discard(c)


broadcaster = WSBroadcaster()
