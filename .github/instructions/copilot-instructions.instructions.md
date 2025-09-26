# .copilot-instructions.md
# GitHub Copilot Instruction File — AITrader (complete, authoritative)

> Place this file at the repository root as `.copilot-instructions.md`.  
> Purpose: provide a persistent, single-source instruction seed so GitHub Copilot produces coherent, containerized, testable code across frontend, backend, Rust engine, ML, CI/CD, and deployment.

---

## One-liner (project purpose)
AITrader — HFT-capable prototype: Rust hot-path Pattern Engine + Python Strategy Engine + ONNX model serving + React control panel. POC/Alpha. Focus on low-latency signals, modular model serving, safe dev workflows, containerized builds.

---

## High-level goals for Copilot
1. Produce **modular, small, testable files** with clear TODOs.  
2. Always include a `Dockerfile` for every service.  
3. Add `// Copilot:` or top-of-file blocks with instructions in generated files.  
4. Be **token-efficient**: stubs + comments instead of huge monoliths.  
5. Use **TypeScript + Tailwind + shadcn/ui** for frontend.  
6. Use **FastAPI + Pydantic** for backend.  
7. Use **Rust (tokio)** for Pattern Engine.  
8. Provide **PyTorch + ONNX** ML skeletons with validation using `onnxruntime`. 
9. Use **Redis Streams** for messaging.
10. Include **pytest**, **React Testing Library**, and **unit tests**.
11. Add **health, ready, metrics** endpoints to all services.
12. Use **multi-stage Docker builds**, CPU defaults, GPU variants documented.
13. Provide **docker-compose.dev.yml** for local dev.
14. Use **TensorBoard for ML metrics**.
15. Use **TensorRT for GPU inference** (documented).
16. **No secrets inline** — use env vars or TODO placeholders.
17. **Write functional tests for UI** and use the **Chrome Devtools mcp tool** for frontend testing.
18. Usage of **FinBERT** for sentiment analysis.
19. Usage of **N-BEATS** for time series forecasting model training.
20. Usage of **LangChain & Haystack** for LLM-based strategy generation.
21. Test everything **inside dockerized environments.**
22. Always refer to **.github/FRONTEND_INSTRUCTIONS.md** and **frontend/README.md** for frontend-specific instructions.



---

## Repo layout
```

/frontend
/backend
/onnxrunner
/pattern_engine
/ml
/deploy
/.github/workflows
/docs
/fixtures
/db
/sentiment_engine
/strategy engine
/tensorrt_runner
/scripts
/finbert_server
```

---

## Frontend

### NavLinks
- Signal Monitor  
- System and Components Monitor  
- Predictions  
- Sentiment  
- Executions  
- Training  
- Metrics  
- DB

### Homepage (MonitorPage)
- **TopNav** (navbar) → Logo, NavLinks, Connection LED, Overall status, User menu.  
- **SignalsMonitor** (SignalsTable, SignalRow, Sparkline).  
- **SystemsMonitor** (components + health cards).  
- **SignalDetailsDrawer** (opens on row click).

### Files to scaffold
- `api/client.ts`, `api/healthClient.ts`, `api/predictionsClient.ts`, `api/sentimentClient.ts`  
- `hooks/useWebSocket.ts`, `useSignals.ts`, `useSystemStatus.ts`, `usePredictions.ts`, `useSentiment.ts`  
- `components/layout/TopNav.tsx`  
- `components/signals/*` → SignalsTable, SignalRow, SignalDetailsDrawer  
- `components/monitor/*` → SystemsMonitor, ComponentCard  
- `components/predictions/*` → PredictionsTable, ForecastRow, ForecastDetailsDrawer  
- `components/sentiment/*` → SentimentDashboard, SymbolSentimentCard  
- `pages/*` → MonitorPage, SystemsPage, PredictionsPage, SentimentPage, ExecutionsPage, TrainingPage, MetricsPage, DBExplorerPage  
- `fixtures/signals.json`, `fixtures/system_status.json`, `fixtures/predictions.json`, `fixtures/sentiment.json`

### UI rules
- Always type props with TypeScript.  
- Use Tailwind utilities + shadcn/ui.  
- Use small fixtures (3–5 entries).  
- Add TODOs for virtualization & accessibility.  
- Provide smoke tests with React Testing Library.  

---

## Backend (FastAPI)

### Endpoints
- `GET /api/signals`  
- `GET /api/predictions`  
- `GET /api/sentiment`  
- `GET /api/components/status`  
- `GET /api/components/:id/metrics`  
- `POST /api/train`  
- WS `/api/ws/monitor` (events: signal, prediction, sentiment, system_status)  
- `GET /health`, `GET /ready`, `GET /metrics`

### File structure
- `backend/main.py` — app, routers, WS.  
- `backend/schemas.py` — Pydantic models for signals, orders, fills, predictions, sentiment, components.  
- `backend/services/` → signals.py, predictions.py, sentiment.py, health.py.  
- `backend/requirements.txt` — pinned deps.  
- `backend/Dockerfile` — multi-stage.  
- `backend/tests/test_api.py` — pytest.

---

## ONNXRunner

### Behavior
- Loads ONNX models (`ONNX_MODEL_PATH`).  
- POST `/infer/forecast/nbeats` → `{forecast, meta}`.  
- Logs `onnxruntime.get_all_providers()` on startup.  
- Exposes `/health`, `/ready`, `/metrics`.

### Files
- `onnxrunner/app.py` — FastAPI server.  
- `onnxrunner/requirements.txt` — onnxruntime (CPU default).  
- `onnxrunner/Dockerfile`.  

---

## Rust Pattern Engine

### Responsibilities
- Consume tick feed (CSV replay or live).  
- Maintain per-symbol state (EMA, VWAP, Welford).  
- Run detectors, emit signals to Redis Streams.  
- Expose `/metrics`, `/health`.

### Files
- `Cargo.toml`, `src/main.rs` (tokio runtime).  
- `src/state.rs` — PerSymbolState.  
- `src/incremental.rs` — incremental math.  
- `src/publisher.rs` — Redis Streams writer.  
- `src/onnx_client.rs` — optional ONNXRunner client.  
- `Dockerfile`.  
- `tests/` — unit tests for incremental fns.  

### Rules
- Minimize allocations.  
- Reuse buffers.  
- Compact JSON payloads.  

---

## ML (N-BEATS, ONNX)

### Files
- `ml/config/nbeats.yml` — defaults (block=256, horizon=60, lr=3e-4, batch=64, epochs=60).  
- `ml/train_nbeats.py` — PyTorch skeleton.  
- `ml/export_to_onnx.py` — ONNX export with `dynamic_axes`.  
- `ml/upload_model.sh` — stub.  
- `ml/README.md`.

### Export rules
- Use `dynamic_axes` for batch/seq/horizon.  
- Validate with `onnxruntime.InferenceSession`.  
- Save normalization stats.  

---

## Redis (Streams)

### Channels
- `signals:global`, `signals:<symbol>`  
- `orders:gateway`  
- `fills:global`  
- `audit:raw_ticks`

### Rules
- Use Streams (`XADD`, `XREADGROUP`, `XACK`).  
- Schema: `id`, `ts`, `seq`, `correlation_id`, `payload`.  
- Monitor lag with `XPENDING`.  

---

## Containerization rules
- Multi-stage builds.  
- CPU defaults, GPU variants documented.  
- Add `LABEL org.opencontainers.image.source`.  
- Health endpoints required.  
- Minimal runtime images.  

---

## docker-compose.dev.yml
Include:
- redis  
- backend  
- onnxrunner (CPU)  
- pattern_engine (dev mode)  
- frontend (dev server or static)  
- optional health-proxy  

---

## Kubernetes (docs)
- ONNXRunner GPU → separate deployment, GPU nodepool.  
- Pattern Engine → DaemonSet on hotpath nodes.  
- Postgres as StatefulSet.  
- S3 for model artifacts.  
- Prometheus + Grafana dashboards.  

---

## CI/CD
Create `.github/workflows/ci.yml` with jobs:
- lint (frontend/backend).  
- test (pytest, cargo test, ml smoke).  
- build (docker images).  
- onnx-smoke (CPU export test).  
- publish (push images if on main).  

---

## Observability
- All services: `/health`, `/ready`, `/metrics`.  
- Metrics:  
  - `ticks_processed_total`  
  - `signals_emitted_total`  
  - `inference_latency_ms`  
  - `orders_total`, `fills_total`  
  - `redis_stream_pending{stream}`  
- Logs: JSON, include `trace_id` and `correlation_id`.  

---

## Security
- Secrets via env vars.  
- Env names: `REDIS_URL`, `DB_URL`, `ONNX_MODEL_PATH`, `S3_BUCKET`, `VAULT_ADDR`, `VAULT_TOKEN`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`.  
- Add `SECURITY.md`.  
- Signed model artifacts recommended.  

---

## Testing
- Frontend: smoke tests with fixtures.  
- Backend: pytest with TestClient.  
- Pattern Engine: unit tests for math fns.  
- ML: ONNX export smoke test.  
- CI runs all above.  

---

## Commit checklist
- `.copilot-instructions.md`  
- `README.md`  
- Frontend scaffolding + fixtures + Dockerfile  
- Backend skeleton + Dockerfile  
- ONNXRunner skeleton + Dockerfile  
- Pattern Engine skeleton + Dockerfile  
- ML config + scripts  
- Docs (schemas, k8s notes, compose example)  
- CI workflow  
- `docker-compose.dev.yml`  
- `CHATGPT_CONTEXT_DIGEST.txt`  

---

## Usage
- Add this file at repo root.  
- Add top-of-file prompts in source files:  

```

/*
Copilot:

* Implement according to .copilot-instructions.md.
* Produce concise stub with TODOs.
* For UI: use sample fixtures in frontend/fixtures and types in frontend/api.
  */

```

- Keep `CHATGPT_CONTEXT_DIGEST.txt` updated with project digest and paste it into ChatGPT when needed.  

---

## Final notes to Copilot
- Do not invent secrets or fake API keys.  
- Prefer CPU-safe defaults.  
- Produce modular files, short completions, many small commits.  
- Add TODOs for production-only steps.  

---

End of `.copilot-instructions.md`
```