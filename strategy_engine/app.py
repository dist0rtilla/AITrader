from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
import requests
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from . import db as _db
from . import models as _models
from . import langchain_haystack as _rag

# create DB tables at startup if possible
try:
    _models.Base.metadata.create_all(bind=_db.engine)
except Exception:
    # will be created when a DB is available (e.g., in docker-compose)
    logging.info('DB tables not created at startup; ensure DATABASE_URL is set in production')

logger = logging.getLogger(__name__)
app = FastAPI(title="Strategy Engine")


class Signal(BaseModel):
    symbol: str
    score: float  # pattern engine confidence (-1..1)
    source: Optional[str] = None


class Sentiment(BaseModel):
    symbol: str
    sentiment_score: float  # -1..1
    authenticity_score: float  # 0..1


class DecideRequest(BaseModel):
    signals: List[Signal]
    sentiment: Optional[List[Sentiment]] = None
    strategy_weights: Optional[Dict[str, float]] = None  # overrides


class Decision(BaseModel):
    symbol: str
    action: str  # 'buy'/'sell'/'hold'
    confidence: float
    rationale: Optional[str] = None


# in-memory reward store and leaderboard
_rewards: Dict[str, List[float]] = {}
_leaderboard: Dict[str, float] = {}


def compute_weighted_decision(signals: List[Signal], sentiment: Optional[List[Sentiment]] = None, weights: Optional[Dict[str, float]] = None) -> List[Decision]:
    # Default weights
    w = {
        'pattern': 0.6,
        'sentiment': 0.3,
        'strategy': 0.1,
    }
    if weights:
        w.update(weights)

    # index sentiment by symbol
    sent_map = {s.symbol: s for s in (sentiment or [])}

    decisions: List[Decision] = []
    for sig in signals:
        pat_score = float(sig.score)
        sent_score = 0.0
        auth = 0.0
        if sig.symbol in sent_map:
            sent_score = float(sent_map[sig.symbol].sentiment_score)
            auth = float(sent_map[sig.symbol].authenticity_score)
        # combine: weight pattern and sentiment; authenticity scales sentiment impact
        combined = w['pattern'] * pat_score + w['sentiment'] * (sent_score * auth) + w['strategy'] * 0.0
        # convert to discrete action
        if combined > 0.2:
            action = 'buy'
        elif combined < -0.2:
            action = 'sell'
        else:
            action = 'hold'
        decisions.append(Decision(symbol=sig.symbol, action=action, confidence=abs(combined), rationale=f"combined={combined:.3f}"))
    return decisions


@app.post('/decide', response_model=List[Decision])
async def decide(req: DecideRequest):
    try:
        decs = compute_weighted_decision(req.signals, req.sentiment, req.strategy_weights)
        return decs
    except Exception as e:
        logger.exception('Decision error: %s', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/decide_rag')
async def decide_rag(req: DecideRequest, llm_model: Optional[str] = None):
    """Optional RAG-backed decision endpoint that uses LangChain (+Haystack optional).

    This endpoint is guarded: if LangChain is not installed the endpoint returns a helpful
    501 response indicating the optional dependency is missing.
    """
    if not _rag.is_rag_available():
        raise HTTPException(status_code=501, detail="RAG endpoint requires `langchain` (and an LLM) to be installed and configured")

    try:
        # adapt Pydantic models to raw dicts expected by the helper
        sigs = [s.dict() for s in req.signals]
        sents = [s.dict() for s in (req.sentiment or [])]
        out = _rag.rag_decide(sigs, sents, llm_model=llm_model)
        return out
    except Exception as e:
        logger.exception('RAG decision error: %s', e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/submit_reward')
async def submit_reward(symbol: str, model: str, reward: float, db: Session = Depends(_db.get_db)):
    # persist reward
    r = _models.Reward(model=model, symbol=symbol, reward=float(reward))
    db.add(r)
    db.commit()
    db.refresh(r)

    # compute new average for (model, symbol) and upsert leaderboard
    avg = db.query(_models.Reward).filter(_models.Reward.model == model, _models.Reward.symbol == symbol).with_entities(func.avg(_models.Reward.reward)).scalar()  # type: ignore
    # simple upsert
    lb = db.query(_models.Leaderboard).filter(_models.Leaderboard.model == model, _models.Leaderboard.symbol == symbol).first()
    if lb is None:
        lb = _models.Leaderboard(model=model, symbol=symbol, score=float(avg or 0.0))
        db.add(lb)
    else:
        lb.score = float(avg or 0.0)
    db.commit()
    db.refresh(lb)
    return {"ok": True, "avg_reward": lb.score}


@app.get('/leaderboard')
async def leaderboard(top: Optional[int] = 10):
    items = sorted(_leaderboard.items(), key=lambda kv: kv[1], reverse=True)[: top or 10]
    return [{"model": k.split(':')[0], "symbol": k.split(':')[1], "score": v} for k, v in items]


@app.get('/health')
async def health():
    return {"ok": True}


# small helper to forward decision to execution engine
def forward_to_execution(decision: Decision, exec_url: str) -> Dict[str, Any]:
    payload = {
        'symbol': decision.symbol,
        'action': decision.action,
        'confidence': decision.confidence,
    }
    try:
        r = requests.post(exec_url.rstrip('/') + '/execute', json=payload, timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.exception('Forward to execution failed: %s', e)
        return {'ok': False, 'error': str(e)}
