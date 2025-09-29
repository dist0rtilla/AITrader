FinBERT Server

This is a small Flask server that loads a FinBERT model and exposes a /predict
endpoint for simple sentiment inference. It's intended for local development
and CI validation. For production workloads prefer a dedicated model-serving
solution (TorchServe, FastAPI with batching, or HF Inference endpoints).

Quick start (local, with model download):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r finbert_server/requirements.txt
python finbert_server/app.py
```

Environment variables:
- MODEL_NAME: Hugging Face model ID to load (default: `yiyanghkust/finbert-tone`)
- HF_HOME or TRANSFORMERS_CACHE: optional cache directory for downloaded models
- HOST, PORT: server bind address and port (defaults: 0.0.0.0:5000)

Docker (build and run):

```bash
docker build -t finbert-server:local finbert_server/
docker run --rm -p 5000:5000 finbert-server:local
```

Run tests (lightweight, does not download models):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r finbert_server/requirements.txt
pytest -q finbert_server/tests
```

Notes:
- The application lazily loads the model on first /predict call so that a
	health probe can run before the model is available. The `/reload` endpoint
	forces a re-load and is useful for tests.
- The provided pytest suite monkeypatches the HF pipeline to avoid heavy
	downloads during CI. For an integration test that loads the real model,
	run it manually with network access and sufficient disk space for the HF
	cache.

CI / fast checks
- This repository includes a GitHub Actions workflow `.github/workflows/finbert-ci.yml`
	which runs the fast unit tests using a CI-only requirements file that omits
	heavy model/runtime packages. The workflow also demonstrates building the
	Docker image with `docker build --no-cache` using the existing `Dockerfile`.

If you'd like CI to run a full integration test that downloads the real model,
consider adding a separate workflow or job that installs `transformers` and a
CPU `torch` wheel (or uses a runner with a cached wheel) and marks that job as
manual or scheduled to avoid slowing down normal PR feedback.

Integration tests
- An optional integration workflow is included at `.github/workflows/finbert-integration.yml`.
	It runs on manual dispatch, weekly schedule, or when a pull request is labeled
	with `run-integration-tests`. The integration job installs the full
	`requirements.txt` and runs pytest with the `integration` marker. Expect
	substantial network and disk activity (model downloads). Use this only when
	you want to validate the real model end-to-end.

To run integration tests locally (beware of downloads):

```bash
export TRANSFORMERS_CACHE=~/.cache/huggingface
python -m pytest -q -m integration finbert_server/tests
```
