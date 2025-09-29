FinBERT Server

This is a small Flask server that loads a FinBERT model and exposes a /predict
endpoint for simple sentiment inference. It's intended for local development and
CI validation; in production prefer a robust model-serving solution (TorchServe,
FastAPI with batching, or HF Inference endpoints).

Run locally:

```bash
pip install -r finbert_server/requirements.txt
python finbert_server/app.py
```
