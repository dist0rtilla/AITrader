from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import logging
from typing import Set
from fastapi import WebSocket
from backend.ws_broadcaster import broadcaster

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend.main")

app = FastAPI(title="AITrader Main API")

# Dev-friendly CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connected WebSocket clients are managed by ws_broadcaster
_clients: Set[WebSocket] = set()



async def _safe_send(ws: WebSocket, payload: dict):
    try:
        await ws.send_json(payload)
    except Exception:
        # If send fails, ensure removal elsewhere
        logger.exception("failed to send to client")


@app.websocket("/api/ws/monitor")
async def ws_monitor(websocket: WebSocket):
    """WebSocket endpoint for realtime monitor.

    Sends periodic system_status messages. In production this should subscribe to
    Redis Streams or another event bus and forward events to connected clients.
    """
    await websocket.accept()
    await broadcaster.add_client(websocket)
    logger.info(f"client connected")
    try:
        while True:
            payload = {"type": "system_status", "data": {"ok": True}}
            await _safe_send(websocket, payload)
            # If client sends anything, we won't block on receive here; just heartbeat
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        logger.info("client disconnected")
    finally:
        await broadcaster.remove_client(websocket)


@app.post("/api/broadcast")
async def broadcast(request: Request):
    """Broadcast the posted JSON payload to all connected WS clients (dev helper)."""
    payload = await request.json()
    await broadcaster.broadcast_json(payload)
    return JSONResponse({"sent": len(list(broadcaster._clients))})


@app.get("/health")
async def health():
    return {"ok": True}


@app.on_event('startup')
async def on_startup():
    # start broadcaster background task (redis listener)
    await broadcaster.start()

