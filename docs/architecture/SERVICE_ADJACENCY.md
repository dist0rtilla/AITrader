# Service adjacency list (compact)

This file provides a compact adjacency list: each service followed by its outbound dependencies (who it calls or publishes to).

- Market Data
  - -> Tick Replay

- Tick Replay
  - -> Redis (ticks stream)
  - -> Pattern Engine (tick input)

- Book Builder
  - -> Redis (order book)

- Pattern Engine
 - Pattern Engine
  - -> Redis (signals stream)
  - -> PatternLibrary (local model lookup/inference)
  - Implementation notes:
    - The Pattern Engine logical service is implemented primarily as Python orchestration (runners, detector, publisher). A Rust crate (hot-path) lives under `pattern_engine/` and is exposed to Python via a pyo3 extension at `pattern_engine/pyo3_wrapper` for low-latency workloads.
    - Heavy inference libraries (onnxruntime, TensorRT) are imported lazily inside the runner/engine initialization to avoid import-time errors on CPU-only developer environments.
    - Developers: prefer the in-process pyo3 binding for low-latency tasks. If the extension is unavailable, code falls back to the Rust binary or pure-Python implementation.
    - CI recommendation: add a workflow that builds the pyo3 extension (maturin) and runs a smoke test to import `pattern_engine_pyo3` and exercise `run_replay_publish` against a disposable Redis or a mock. This catches integration regressions early.

- Strategy Engine
  - -> Redis (consume signals, publish orders)
  - -> PostgreSQL (ORM persistence)
  - -> Mock MCP (HTTP calls)
  - -> ONNX Runner (HTTP infer) [planned]
  - -> TensorRT Runner (HTTP infer) [planned]
  - -> Sentiment Engine (HTTP) [planned]

- Execution Engine
  - -> Redis (orders:gateway)
  - -> Redis (publish fills)

- Redis
  - -> Strategy Engine (signals stream)
  - -> Execution Engine (orders channel)
  - -> Any consumer services reading streams (workers, backends)

- ONNX Runner
  - -> ModelStorage (local ./models/)
  - -> (HTTP endpoints consumed by Strategy Engine, Backend, Workers)

- TensorRT Runner
  - -> ModelStorage (TRT engines)
  - -> (HTTP endpoints consumed by Strategy Engine, Backend, Workers)

- Sentiment Engine
  - -> FinBERT (HTTP) for NLP inference
  - -> (HTTP endpoints consumed by Strategy Engine, Backend, Frontend)

- FinBERT
  - -> (model files / local inference)

- Backend (Main REST / WS)
  - -> PostgreSQL (queries)
  - -> Redis (pub/sub)
  - -> ONNX Runner (HTTP)
  - -> Sentiment Engine (HTTP)
  - -> Frontend (WebSocket)

- Worker
  - -> Redis (jobs)
  - -> ONNX Runner (training/inference jobs)
  - -> PostgreSQL (job status)

- Frontend
  - -> Backend (HTTP/WS)
  - -> ONNX Runner (direct calls for demonstrations)
  - -> Sentiment Engine (direct calls for demonstrations)

- Mock MCP
  - -> (Simulates account/execution endpoints; consumed by Strategy Engine)

Notes:
- Items marked [planned] are shown in the visual SERVICE_MAP as not fully implemented or currently missing direct integrations.
- Redis is the central event bus; many components publish or consume streams (ticks, signals, orders, fills).
