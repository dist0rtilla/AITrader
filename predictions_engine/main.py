import asyncio
import json
import os
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx
import orjson
from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, create_engine, text
from sqlalchemy.orm import declarative_base, Session
import redis
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from predictions_engine.data_sources import MarketDataSource, YFinanceSource


def get_env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


class ForecastRequest(BaseModel):
    symbol: str
    history: List[float]
    horizon: str


class ForecastResponse(BaseModel):
    symbol: str
    horizon: str
    timestamp: str
    forecast: List[float]
    confidence: List[float]
    model: str


class SeriesRequest(BaseModel):
    symbol: str
    horizon: str
    points: int = 10


class ActualsSeries(BaseModel):
    start_timestamp: str
    step_seconds: int
    values: List[float]


class AlignRequest(BaseModel):
    symbol: str
    horizon: str
    forecast: Optional[ForecastResponse] = None
    actuals: ActualsSeries


REDIS_URL = get_env("REDIS_URL", "redis://localhost:6379/0")
ONNX_RUNNER_URL = get_env("ONNX_RUNNER_URL", "http://localhost:8001")
TENSORRT_RUNNER_URL = get_env("TENSORRT_RUNNER_URL", "http://localhost:8007")
INFER_BACKEND = get_env("INFER_BACKEND", "onnx")  # onnx|tensorrt|auto
DATABASE_URL = get_env("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/aitrader")
SYMBOLS = [s for s in get_env("PRED_SYMBOLS", "AAPL").split(",") if s]
HORIZONS = [h for h in get_env("PRED_HORIZONS", "1m,5m").split(",") if h]
INTERVAL_MS = int(get_env("PRED_INTERVAL_MS", "60000"))
SNAPSHOT_TTL_SEC = int(get_env("PRED_SNAPSHOT_TTL_SEC", "180"))
PORT = int(get_env("PRED_PORT", "8011"))
DATA_SOURCE = get_env("PRED_DATA_SOURCE", "yfinance")


app = FastAPI(title="Predictions Engine")


_redis_client: Optional[redis.Redis] = None
_http_client: Optional[httpx.AsyncClient] = None
_db_engine = None
Base = declarative_base()
_data_source: Optional[MarketDataSource] = None


class ForecastRow(Base):
    __tablename__ = "forecasts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(32), index=True, nullable=False)
    horizon = Column(String(16), index=True, nullable=False)
    model = Column(String(64), nullable=False, default="nbeats")
    timestamp = Column(DateTime(timezone=True), nullable=False)
    forecast = Column(JSON, nullable=False)
    confidence = Column(JSON, nullable=False)


class ForecastMetricRow(Base):
    __tablename__ = "forecast_metrics"
    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(32), index=True, nullable=False)
    horizon = Column(String(16), index=True, nullable=False)
    model = Column(String(64), nullable=False, default="nbeats")
    timestamp = Column(DateTime(timezone=True), nullable=False)
    realized = Column(Float, nullable=False)
    error_abs = Column(Float, nullable=False)
    error_pct = Column(Float, nullable=False)


def _redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client


def _db() -> Session:
    global _db_engine
    if _db_engine is None:
        _db_engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        Base.metadata.create_all(_db_engine)
    return Session(bind=_db_engine)


def _ds() -> MarketDataSource:
    global _data_source
    if _data_source is None:
        # pluggable mapping by name; can expand later
        if DATA_SOURCE == "yfinance":
            _data_source = YFinanceSource()
        else:
            _data_source = YFinanceSource()
    return _data_source


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _http() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(timeout=2.0)
    return _http_client


async def onnx_infer(symbol: str, history: List[float], horizon: str) -> Dict:
    client = await _http()
    try:
        resp = await client.post(
            f"{ONNX_RUNNER_URL}/infer/forecast/nbeats",
            json={"symbol": symbol, "history": history[-120:], "horizon": horizon},
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        return {"forecast": [], "confidence": [], "error": str(e), "model": "nbeats"}


async def tensorrt_infer(symbol: str, history: List[float], horizon: str) -> Dict:
    client = await _http()
    try:
        resp = await client.post(
            f"{TENSORRT_RUNNER_URL}/infer/forecast/nbeats",
            json={"symbol": symbol, "history": history[-120:], "horizon": horizon},
        )
        resp.raise_for_status()
        data = resp.json()
        data["model"] = data.get("model", "nbeats_trt")
        return data
    except Exception as e:
        return {"forecast": [], "confidence": [], "error": str(e), "model": "nbeats_trt"}


async def infer(symbol: str, history: List[float], horizon: str) -> Dict:
    if INFER_BACKEND == "onnx":
        return await onnx_infer(symbol, history, horizon)
    if INFER_BACKEND == "tensorrt":
        return await tensorrt_infer(symbol, history, horizon)
    # auto: try TRT, fallback to ONNX
    result = await tensorrt_infer(symbol, history, horizon)
    if result.get("forecast"):
        return result
    return await onnx_infer(symbol, history, horizon)


async def publish_forecast(symbol: str, horizon: str, forecast: List[float], confidence: List[float], model: str = "nbeats") -> Dict:
    payload = {
        "symbol": symbol,
        "horizon": horizon,
        "timestamp": _now_iso(),
        "forecast": forecast,
        "confidence": confidence,
        "model": model,
    }
    key_snapshot = f"forecasts:{symbol}:{horizon}"
    stream_key = f"forecasts_stream:{symbol}"
    r = _redis()
    r.set(key_snapshot, orjson.dumps(payload), ex=SNAPSHOT_TTL_SEC)
    r.xadd(stream_key, {"data": orjson.dumps(payload).decode("utf-8")}, maxlen=1000, approximate=True)

    # persist to DB for feedback/backtesting
    try:
        with _db() as session:
            row = ForecastRow(
                symbol=symbol,
                horizon=horizon,
                model=model,
                timestamp=datetime.now(timezone.utc),
                forecast=forecast,
                confidence=confidence,
            )
            session.add(row)
            session.commit()
    except Exception:
        # persistence failures should not block hot path
        pass
    return payload


async def rolling_producer_task():
    while True:
        start = time.time()
        tasks = []
        for symbol in SYMBOLS:
            history = await _ds().get_history(symbol, points=120, interval=HORIZONS[0] if HORIZONS else "1m")
            for horizon in HORIZONS:
                tasks.append(_produce_once(symbol, history, horizon))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        elapsed = (time.time() - start) * 1000.0
        await asyncio.sleep(max(0.0, (INTERVAL_MS - elapsed) / 1000.0))


async def _produce_once(symbol: str, history: List[float], horizon: str):
    result = await infer(symbol, history, horizon)
    forecast = result.get("forecast") or []
    confidence = result.get("confidence") or [0.0 for _ in forecast]
    model = result.get("model", "nbeats")
    await publish_forecast(symbol, horizon, forecast, confidence, model)


@app.get("/health")
async def health():
    try:
        _ = _redis().ping()
        # simple DB check
        with _db() as session:
            session.execute(text("SELECT 1"))
        return {"ok": True, "symbols": SYMBOLS, "horizons": HORIZONS, "db": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecasts/latest")
async def get_latest(symbol: str, horizon: str):
    key_snapshot = f"forecasts:{symbol}:{horizon}"
    raw = _redis().get(key_snapshot)
    if not raw:
        raise HTTPException(status_code=404, detail="No snapshot available")
    return JSONResponse(content=json.loads(raw))


@app.post("/infer/forecast/nbeats", response_model=ForecastResponse)
async def infer_forecast(req: ForecastRequest):
    result = await infer(req.symbol, req.history, req.horizon)
    forecast = result.get("forecast") or []
    confidence = result.get("confidence") or [0.0 for _ in forecast]
    payload = {
        "symbol": req.symbol,
        "horizon": req.horizon,
        "timestamp": _now_iso(),
        "forecast": forecast,
        "confidence": confidence,
        "model": result.get("model", "nbeats"),
    }
    return payload


@app.on_event("startup")
async def on_startup():
    # start rolling producer in background
    asyncio.create_task(rolling_producer_task())


class EvalRequest(BaseModel):
    symbol: str
    horizon: str
    model: str = "nbeats"
    predicted_at: Optional[str] = None
    realized: float


@app.post("/forecasts/eval")
async def eval_forecast(req: EvalRequest):
    """Record realized outcome and compute basic reward metrics.
    For MVP, error is relative to first forecast value.
    """
    try:
        ts = datetime.fromisoformat(req.predicted_at) if req.predicted_at else datetime.now(timezone.utc)
    except Exception:
        ts = datetime.now(timezone.utc)
    # fetch last forecast snapshot
    key_snapshot = f"forecasts:{req.symbol}:{req.horizon}"
    raw = _redis().get(key_snapshot)
    if not raw:
        raise HTTPException(status_code=404, detail="No forecast snapshot to evaluate")
    payload = json.loads(raw)
    predicted = float(payload.get("forecast", [0.0])[0] or 0.0)
    realized = float(req.realized)
    error_abs = abs(realized - predicted)
    error_pct = (error_abs / max(1e-6, abs(predicted))) * 100.0

    try:
        with _db() as session:
            mrow = ForecastMetricRow(
                symbol=req.symbol,
                horizon=req.horizon,
                model=req.model,
                timestamp=ts,
                realized=realized,
                error_abs=error_abs,
                error_pct=error_pct,
            )
            session.add(mrow)
            session.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"persist metric failed: {e}")

    return {"symbol": req.symbol, "horizon": req.horizon, "predicted": predicted, "realized": realized, "error_abs": error_abs, "error_pct": error_pct}


@app.get("/forecasts/series")
async def get_series(symbol: str, horizon: str, limit: int = 100):
    """Return a chart-friendly series from the forecasts stream (most recent first)."""
    stream_key = f"forecasts_stream:{symbol}"
    items = _redis().xrevrange(stream_key, count=max(1, min(limit, 1000)))
    series = []
    for _id, fields in items:
        data_raw = fields.get("data")
        if not data_raw:
            continue
        try:
            series.append(json.loads(data_raw))
        except Exception:
            continue
    # reverse to chronological order
    series.reverse()
    return {"symbol": symbol, "horizon": horizon, "series": series}


@app.post("/forecasts/align")
async def align_forecast(req: AlignRequest):
    """Align a forecast with provided actuals for front-end overlay.
    For MVP, we assume the forecast starts at the actuals start_timestamp.
    """
    # obtain forecast: use provided or fetch latest snapshot
    fc = req.forecast
    if fc is None:
        key = f"forecasts:{req.symbol}:{req.horizon}"
        raw = _redis().get(key)
        if not raw:
            raise HTTPException(status_code=404, detail="No forecast snapshot")
        fc = ForecastResponse(**json.loads(raw))

    actuals = req.actuals
    step = max(1, actuals.step_seconds)
    # Extend or clip forecast to match actuals length
    n = len(actuals.values)
    fc_vals = fc.forecast
    if len(fc_vals) < n:
        # pad last value
        if fc_vals:
            fc_vals = fc_vals + [fc_vals[-1]] * (n - len(fc_vals))
        else:
            fc_vals = [0.0] * n
    else:
        fc_vals = fc_vals[:n]

    # Build aligned arrays
    aligned = {
        "symbol": req.symbol,
        "horizon": req.horizon,
        "start_timestamp": actuals.start_timestamp,
        "step_seconds": step,
        "actuals": actuals.values,
        "forecast": fc_vals,
        "model": fc.model,
    }
    return aligned


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)

