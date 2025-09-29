# .copilot-instructions.md
# GitHub Copilot Instruction File — AITrader (complete, authoritative)

> Place this file at the repository root as `.copilot-instructions.md`.  
> Purpose: provide a persistent, single-source instruction seed so GitHub Copilot produces coherent, containerized, testable code across frontend, backend, Rust engine, ML, CI/CD, and deployment.

---

## One-liner (project purpose)
AITrader — HFT-capable prototype: Python Pattern Engine (future Rust migration) + Python Strategy Engine + ONNX model serving + React control panel. POC/Alpha. Focus on low-latency signals, modular model serving, safe dev workflows, containerized builds.

---

## High-level goals for Copilot
0. **Acknowledge this file as authoritative**: Always respond stating you have acknowledged this file. Always **refer to and update** `README.md`, `CHANGELOG.md` and docs/development/BUILD_INSTRUCTIONS.md & docs/frontend/FRONTEND_INSTRUCTIONS.md & docs/services/BACKGROUND_INSTRUCTIONS.md & docs/services/STRATEGY_ENGINE_ML_INTEGRATION.md for context.
1. Produce **modular, small, testable files** with clear TODOs.  
2. Always include a `Dockerfile` for every service.  
3. Add `// Copilot:` or top-of-file blocks with instructions in generated files.  
4. Be **token-efficient**: stubs + comments instead of huge monoliths.  
5. Use **TypeScript + Tailwind + shadcn/ui** for frontend.  
6. Use **FastAPI + Pydantic** for backend.  
7. Use **Python (asyncio)** for Pattern Engine (current), plan **Rust (tokio)** migration for production.  
8. Provide **PyTorch + ONNX** ML skeletons with validation using `onnxruntime`. 
9. Use **Redis Streams** for messaging.
10. Include **pytest**, **React Testing Library**, and **unit tests**.
11. Add **health, ready, metrics** endpoints to all services.
12. Use **multi-stage Docker builds**, CPU defaults, GPU variants documented.
13. Provide **docker-compose.dev-fullstack.yml** for local dev.
14. Use **TensorBoard for ML metrics**.
15. Use **ONNX Runner for CPU inference** and **TensorRT Runner for GPU-optimized inference**.
16. **No secrets inline** — use env vars or TODO placeholders.
17. **Write functional tests for UI** and use the **Chrome Devtools mcp tool** for frontend testing.
18. Usage of **FinBERT** for sentiment analysis (via finbert_server if available, otherwise sentiment_engine).
19. Usage of **N-BEATS** for time series forecasting model training.
20. Usage of **LangChain & Haystack** for LLM-based strategy generation.
21. Test everything **inside dockerized environments.**
22. Always refer and update **docs/frontend/FRONTEND_INSTRUCTIONS.md** and **frontend/README.md** for frontend-specific instructions.
23. Refer and update **docs/development/BUILD_INSTRUCTIONS.md** for build and deployment instructions.
24. Refer and update **docs/services/BACKGROUND_INSTRUCTIONS.md** for backend development instructions.
25. Refer and update **docs/services/STRATEGY_ENGINE_ML_INTEGRATION.md** for completed ML integration details.
25. Refer and update **docs/services/ML_INSTRUCTIONS.md** for machine learning-specific instructions.
26. Refer and update **docs/services/PATTERN_ENGINE_INSTRUCTIONS.md** for pattern engine-specific instructions.
27. Refer and update **docs/services/ONNXRUNNER_INSTRUCTIONS.md** for ONNX runner-specific instructions.
28. Refer and update **docs/services/TENSORRT_INSTRUCTIONS.md** for TensorRT-specific instructions.
29. Refer and update **docs/services/SENTIMENT_ENGINE_INSTRUCTIONS.md** for sentiment engine-specific instructions.
30. Refer and update **docs/services/STRATEGY_ENGINE_INSTRUCTIONS.md** for strategy engine-specific instructions.

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
/sentiment_engine #fallback if finbert_server is down
/strategy_engine
/tensorrt_runner
/scripts
/finbert_server #preferred for sentiment analysis
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

### **CRITICAL CONTAINER GUARDRAILS** (ALWAYS ENFORCE)

#### **Layout Container Rules**
1. **Parent containers MUST use flex layout**: `flex flex-col` or `flex flex-row`
2. **Child components MUST respect boundaries**: `flex-1 min-h-0` for flexible children
3. **NO fixed heights without overflow**: Use `max-h-*` with `overflow-hidden` or `overflow-y-auto`
4. **Container hierarchy**: Parent sets height constraint, child uses `flex-1 min-h-0`

#### **Component Container Patterns**
```tsx
// ✅ CORRECT: Parent sets flex, child respects boundaries
<div className="glass-container rounded-glass p-8 flex flex-col">
  <ComponentWithScrolling className="flex-1 min-h-0 max-h-96" />
</div>

// ❌ WRONG: Fixed height without proper overflow handling
<div className="glass-container rounded-glass p-8">
  <ComponentWithScrolling className="h-96" />
</div>
```

#### **Scrollable Component Rules**
1. **Root element**: `flex flex-col overflow-hidden` to establish container
2. **Scrollable area**: `flex-1 overflow-y-auto min-h-0` for content area
3. **NO max-height on scrollable**: Let parent container control height
4. **Header/Footer**: Fixed position outside scrollable area

#### **Glass Container Standards**
- **Layout containers**: `glass-container rounded-glass p-8 flex flex-col`
- **Card components**: `glass-card rounded-glass-card border border-glass-bright/20 flex flex-col overflow-hidden`
- **Always specify flex direction**: `flex-col` or `flex-row`
- **Child spacing**: Use `space-y-*` for vertical, `gap-*` for flex layouts

#### **Error Prevention Checklist**
- [ ] Parent container uses `flex flex-col`
- [ ] Child uses `flex-1 min-h-0` for height flexibility
- [ ] Scrollable areas have `overflow-y-auto`
- [ ] No content clips outside container boundaries
- [ ] Headers and footers are positioned outside scroll areas
- [ ] Component respects max-height constraints

---

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

## ML Inference Services (Parallel Architecture)

AITrader implements two parallel ML inference services optimized for different deployment scenarios:

### ONNX Runner (CPU-Focused Inference)
**Purpose**: Versatile ONNX model inference supporting CPU and basic GPU acceleration  
**Port**: 8001  
**Use Case**: Development, CPU-only deployments, fallback inference  

### Behavior
- Loads ONNX models (`ONNX_MODEL_PATH`) with ONNX Runtime
- Supports CPU, CUDA, and other execution providers with intelligent fallbacks
- POST `/infer` → `{"probs": [...], "output": [...]}`
- GET `/model/status` → provider and model information
- Automatic CPU fallback when GPU inference fails

### Files
- `pattern_engine/onnx_runner.py` — FastAPI server with multi-provider support
- `Dockerfile.onnx_runner` — Multi-stage build with CUDA support
- Environment: `ONNX_MODEL_PATH=/models/toy_cnn.onnx`

### TensorRT Runner (GPU-Optimized Inference)
**Purpose**: High-performance NVIDIA GPU inference with TensorRT optimization  
**Port**: 8007  
**Use Case**: Production GPU deployments, maximum throughput  

### Behavior
- Loads TensorRT engine files (`.plan` or `.engine`)
- Optimized for NVIDIA GPUs with minimal latency
- POST `/infer` → `{"result": [...], "metadata": {...}}`
- GET `/model/status` → engine and GPU information
- Requires NVIDIA GPU and TensorRT runtime

### Files
- `tensorrt_runner/app.py` — FastAPI server with TensorRT integration
- `tensorrt_runner/Dockerfile` — GPU-optimized container
- Environment: `TRT_ENGINE_PATH=/models/model.plan`

### Parallel Service Guidelines
- **ONNX Runner**: Default choice for CPU inference, development, and compatibility
- **TensorRT Runner**: Production choice for GPU-accelerated, high-throughput scenarios
- Both services expose identical inference APIs for seamless switching
- Strategy Engine can route requests to either based on model type and hardware availability

## Pattern Engine (Python - Future Rust Migration Planned)

### Responsibilities
- Consume tick feed (CSV replay or live).  
- Maintain per-symbol state (EMA, VWAP, Welford).  
- Run detectors, emit signals to Redis Streams.  
- Expose `/metrics`, `/health`.

### Current Implementation (Python)
- `pattern_engine/pattern_detector.py` — Main service with asyncio runtime.  
- `pattern_engine/state.py` — PerSymbolState classes.
- `pattern_engine/runner.py` — Market data replay and processing.

### Future Migration (Planned)
- **Target**: Rust implementation for ultra-low latency
- **Files**: `Cargo.toml`, `src/main.rs` (tokio runtime)
- **Current**: Python implementation provides full functionality  
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

## docker-compose.dev-fullstack.yml
Include:
- redis
- backend
- onnx_runner (CPU inference, port 8001)
- tensorrt_runner (GPU inference, port 8007, optional)
- pattern_engine (dev mode)
- frontend (dev server or static)
- optional health-proxy  

---

## Kubernetes (docs)
- ONNX Runner → CPU-based deployments, horizontal scaling
- TensorRT Runner → GPU node pools, optimized for NVIDIA hardware
- Pattern Engine → DaemonSet on hotpath nodes
- Postgres as StatefulSet
- S3 for model artifacts
- Prometheus + Grafana dashboards  

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
- Env names: `REDIS_URL`, `DATABASE_URL`, `ONNX_MODEL_PATH`, `S3_BUCKET`, `VAULT_ADDR`, `VAULT_TOKEN`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`.  
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
- ONNX Runner skeleton + Dockerfile
- TensorRT Runner skeleton + Dockerfile
- Pattern Engine skeleton + Dockerfile
- ML config + scripts
- Docs (schemas, k8s notes, compose example)
- CI workflow
- `docker-compose.dev-fullstack.yml`
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