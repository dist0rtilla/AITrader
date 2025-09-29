from flask import Flask, request, jsonify
import os
import logging
from typing import Optional, Callable, Any

app = Flask('finbert_server')

# Configuration via environment variables
MODEL_NAME = os.getenv('MODEL_NAME', 'yiyanghkust/finbert-tone')
# Honor standard HF cache env vars (HF_HOME / TRANSFORMERS_CACHE) if provided
CACHE_DIR = os.getenv('HF_HOME') or os.getenv('TRANSFORMERS_CACHE')
_FINBERT: Optional[Callable[[str], Any]] = None

logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO'))
logger = logging.getLogger('finbert_server')


def get_finbert(reload: bool = False):
    """Lazily load the FinBERT pipeline. Call with reload=True to force re-load.

    The function imports transformers components at call time so tests can
    monkeypatch `transformers.pipeline` without triggering heavy downloads on
    module import.
    """
    global _FINBERT
    if reload:
        _FINBERT = None
    if _FINBERT is not None:
        return _FINBERT

    try:
        # import inside function to allow tests to monkeypatch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

        logger.info('Loading model %s (cache_dir=%s)', MODEL_NAME, CACHE_DIR)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=CACHE_DIR) if CACHE_DIR else AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, cache_dir=CACHE_DIR) if CACHE_DIR else AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        _FINBERT = pipeline('sentiment-analysis', model=model, tokenizer=tokenizer)
    except Exception as e:
        logger.exception('Failed to load FinBERT model: %s', e)
        _FINBERT = None
    return _FINBERT


@app.route('/health')
def health():
    """Health endpoint. Returns whether the model is loaded.

    This endpoint does not trigger a model download; it only reports whether
    the pipeline has already been loaded into memory.
    """
    return jsonify({'ok': _FINBERT is not None, 'model_name': MODEL_NAME})


@app.route('/predict', methods=['POST'])
def predict():
    """Predict endpoint. Loads model lazily on first call.

    Body: { "text": "..." }
    """
    finbert = _FINBERT or get_finbert()
    if finbert is None:
        return jsonify({'error': 'model not loaded'}), 503

    data = request.json or {}
    text = data.get('text', '')
    if not isinstance(text, str) or text.strip() == '':
        return jsonify({'error': 'missing or empty "text" in request body'}), 400

    # keep requests bounded
    text = text[:4096]

    try:
        res = finbert(text)
        return jsonify(res)
    except Exception:
        logger.exception('Error during model inference')
        return jsonify({'error': 'inference failed'}), 500


@app.route('/reload', methods=['POST'])
def reload_model():
    """Force reload the model from disk/network. Useful for testing and recovery."""
    fin = get_finbert(reload=True)
    return jsonify({'ok': fin is not None})


if __name__ == '__main__':
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '5000'))
    app.run(host=host, port=port)
