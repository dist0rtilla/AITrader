Sentiment Engine

This small service ingests text and returns an authenticity score and sentiment.

Endpoints
- POST /analyze {text, source?} -> {authenticity_score, sentiment_score, summary}
- GET /health -> {ok, has_hf}

Notes
- By default the service uses a simple rule-based fallback if `transformers` is not installed.
- For production workloads, run this service inside a container with sufficient memory and model caching enabled.

FinBERT and source trust
------------------------

If `transformers` is installed, the service will prefer a finance-tuned model (FinBERT, e.g. `yiyanghkust/finbert-tone`) for sentiment analysis. This gives better performance on financial news and statements than a generic sentiment model.

The service maintains a small allowlist of trusted news sources (e.g., Reuters, Bloomberg, WSJ, FT). Authenticity checks boost the sentiment's influence when the source appears trusted and penalize short social-media-like snippets. You can tune `TRUSTED_SOURCES` in `app.py` for your domain.
