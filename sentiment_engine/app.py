from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import yfinance as yf
import logging
import os
import requests

logger = logging.getLogger(__name__)
app = FastAPI(title="Sentiment Engine")


class AnalyzeRequest(BaseModel):
    text: str
    source: Optional[str] = None


class AnalyzeResponse(BaseModel):
    source: Optional[str]
    authenticity_score: float
    sentiment_score: float
    summary: Optional[str] = None


# Try to import transformers pipeline; if unavailable use a rule-based fallback
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    HAS_HF = True
except Exception as e:  # pragma: no cover - runtime environment dependent
    HAS_HF = False
    logger.info("transformers not available: %s", e)


# simple authenticity checker stub (placeholder for real checks)
# allowlist of trusted news sources (lowercase substrings)
TRUSTED_SOURCES = [
    'reuters', 'bloomberg', 'wsj', 'ft', 'financial times', 'nyt', 'cnbc', 'the guardian', 'the economist'
]


def check_authenticity(text: str, source: Optional[str] = None) -> float:
    # naive heuristic base: longer text slightly more authentic
    score = min(1.0, max(0.0, len(text) / 1000.0))
    src = (source or '').lower()
    # boost if source looks like a trusted news domain
    if any(ts in src for ts in TRUSTED_SOURCES):
        score = min(1.0, score + 0.3)
    # presence of links increases chance it's a quoted article
    if 'http' in text or 'https' in text:
        score = min(1.0, score + 0.1)
    # penalize short social media snippets
    if len(text) < 80 and ('twitter.com' in text or 'x.com' in text or 'tweet' in text):
        score = max(0.0, score - 0.2)
    return round(score, 3)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    auth = check_authenticity(req.text, req.source)
    # Default values
    sentiment_score = 0.0
    summary = None

    if HAS_HF:
        # cache heavy HF pipelines at module level to avoid reloading per request
        global _finbert_pipeline, _finbert_model, _finbert_tokenizer, _summarizer_pipeline
        try:
            finbert_model = 'yiyanghkust/finbert-tone'

            # If a FINBERT model server is configured, prefer calling it to avoid
            # loading large weights in-process.
            finbert_url = os.environ.get('FINBERT_URL')
            if finbert_url:
                try:
                    # allow the env var to be either the full endpoint or a base URL
                    endpoint = finbert_url
                    if not finbert_url.endswith('/predict'):
                        endpoint = finbert_url.rstrip('/') + '/predict'
                    resp = requests.post(endpoint, json={'text': req.text}, timeout=10)
                    resp.raise_for_status()
                    sjson = resp.json()
                    # normalize response to list of {'label', 'score'}
                    if isinstance(sjson, dict):
                        s = [sjson]
                    else:
                        s = sjson
                except Exception:
                    # fall back to local model if external server fails
                    s = None
            else:
                s = None

            if s is None:
                # load/cache local finbert pipeline lazily
                try:
                    if '_finbert_pipeline' not in globals() or _finbert_pipeline is None:
                        _finbert_tokenizer = AutoTokenizer.from_pretrained(finbert_model)
                        _finbert_model = AutoModelForSequenceClassification.from_pretrained(finbert_model)
                        _finbert_pipeline = pipeline('sentiment-analysis', model=_finbert_model, tokenizer=_finbert_tokenizer)
                    s = _finbert_pipeline(req.text[:1000])
                except Exception:
                    # if finbert local load fails, try a generic sentiment pipeline
                    s = None

            if s is None:
                # final fallback to a generic sentiment pipeline
                gen_sent = pipeline('sentiment-analysis')
                s = gen_sent(req.text[:1000])

            # normalize and extract score/label
            label = (s[0].get('label') or s[0].get('label', '')).lower()
            score = float(s[0].get('score', 0.0))
            if label in ('positive', 'pos', 'positive'):  # normalization
                sentiment_score = score
            elif label in ('negative', 'neg'):
                sentiment_score = -score
            else:
                # some pipelines return 'NEUTRAL' or similar
                sentiment_score = 0.0

            # summarization: try a generic summarizer if available (cached)
            try:
                if '_summarizer_pipeline' not in globals() or _summarizer_pipeline is None:
                    _summarizer_pipeline = pipeline('summarization')
                summary = _summarizer_pipeline(req.text[:1024], max_length=80, min_length=20)[0]['summary_text']
            except Exception:
                summary = None

        except Exception as e:
            logger.exception('HF pipeline failed: %s', e)
            raise HTTPException(status_code=500, detail=f"HF inference failed: {e}")
    else:
        # fallback: rule-based sentiment
        txt = req.text.lower()
        pos = sum(txt.count(w) for w in [' good', ' great', ' up ', ' positive', 'bull', 'buy'])
        neg = sum(txt.count(w) for w in [' bad', ' down ', ' negative', 'bear', 'sell'])
        total = pos + neg
        if total == 0:
            sentiment_score = 0.0
        else:
            sentiment_score = (pos - neg) / float(max(1, total))
        summary = None

    return AnalyzeResponse(source=req.source, authenticity_score=auth, sentiment_score=sentiment_score, summary=summary)


@app.get("/health")
async def health():
    return {"ok": True, "has_hf": HAS_HF}


@app.get("/api/news")
async def get_news(symbol: str):
    """Fetch recent headlines via yfinance as placeholder news feed."""
    try:
        ticker = yf.Ticker(symbol)
        news = ticker.news or []
        items = []
        for n in news[:20]:
            items.append({
                "symbol": symbol,
                "title": n.get("title"),
                "publisher": n.get("publisher"),
                "providerPublishTime": n.get("providerPublishTime"),
                "link": n.get("link")
            })
        return {"symbol": symbol, "news": items}
    except Exception as e:
        return {"symbol": symbol, "news": [], "error": str(e)}
