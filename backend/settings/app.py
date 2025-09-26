"""
Copilot:
* FastAPI SettingsService (dev stub). Keep it minimal and testable. TODOs: add persistence and auth for production.
"""

from fastapi import FastAPI
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
from pydantic import BaseModel
from typing import List, Optional
import asyncio

app = FastAPI(title="Settings Service")

# Allow all origins for dev so websocket handshakes aren't rejected due to origin checks.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("settings_ws")
logging.basicConfig(level=logging.INFO)


# ASGI middleware to log incoming scopes (including websocket handshakes)
class ScopeLoggerMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        try:
            if scope.get('type') == 'websocket':
                headers = {k.decode(): v.decode() for k, v in scope.get('headers', [])}
                logger.info(f"ASGI websocket scope: path={scope.get('path')} headers={headers}")
        except Exception:
            logger.exception('failed logging scope')
        await self.app(scope, receive, send)


app.add_middleware(ScopeLoggerMiddleware)


class ConfigItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


# in-memory store for demo
_STORE = {}


@app.get('/health')
async def health():
    return {"ok": True}


@app.websocket('/ws/monitor')
async def websocket_monitor(websocket: WebSocket):
    """Dev stub WebSocket endpoint for frontend realtime monitor.

    The frontend connects to `/api/ws/monitor` (proxied to this service).
    This stub sends periodic dummy status events until the client disconnects.
    Replace with a production event broadcaster that publishes real signals.
    """
    # Log handshake headers for debugging (Origin, Upgrade, Connection)
    origin = websocket.headers.get('origin')
    upgrade = websocket.headers.get('upgrade')
    conn_hdr = websocket.headers.get('connection')
    logger.info(f"WS handshake incoming: origin={origin}, upgrade={upgrade}, connection={conn_hdr}")
    await websocket.accept()
    try:
        while True:
            payload = {
                "type": "system_status",
                "data": {"ok": True}
            }
            await websocket.send_json(payload)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        # client disconnected; nothing to do
        return


@app.get('/configs', response_model=List[ConfigItem])
async def list_configs():
    return [ConfigItem(key=k, value=v['value'], description=v.get('description')) for k, v in _STORE.items()]


@app.post('/configs', response_model=ConfigItem)
async def create_config(cfg: ConfigItem):
    _STORE[cfg.key] = {"value": cfg.value, "description": cfg.description}
    return cfg


@app.get('/configs/{key}', response_model=ConfigItem)
async def get_config(key: str):
    v = _STORE.get(key)
    if not v:
        return ConfigItem(key=key, value='', description=None)
    return ConfigItem(key=key, value=v['value'], description=v.get('description'))
