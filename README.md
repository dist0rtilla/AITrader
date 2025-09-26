# AITrader — architecture & backend replumb

This repository contains the AITrader project scaffold. We are pivoting to a dual‑path architecture that supports both AI day trading and a purpose‑built, low‑latency pattern/strategy execution pipeline suitable for scalping/arbitrage prototypes.

This README documents the new design, the backend replumbing we will implement, the database schema and migration workflow, local development commands (docker), and the immediate next steps to complete the backend changes.

Table of contents
- Design overview
- Services & responsibilities
- Data model (DB tables)
- Migration and DB management (Alembic)
- Dev & run commands (docker-compose + local)
- How to re-plumb the backend (tasks & file structure)
- Testing & CI notes
- Next actions (prioritized)


Design overview
We separate the system into three logical tiers with clear responsibilities:

1. Pattern Engine (hot path)
   - Purpose: detect short‑term micro patterns and produce candidate signals (binary/compact messages).
   - Requirements: deterministic, ultra‑low latency, implemented in native code (Rust/C++). Runs on a streaming feed (tick-level).

2. Strategy Engine (decision & risk)
   - Purpose: consume signals + account context (MCP) and produce order decisions, sizing, and risk management. Accepts more compute; tolerates higher latency than Pattern Engine.
   - Implementation: Python/FastAPI service for rapid iteration, with critical pieces ported to native code if needed.

3. Execution/OMS (reliable order lifecycle)
   - Purpose: enforce authoritative risk controls, send orders to broker/exchange, handle confirmations and fills, provide audit trail and kill switches.
   - Requirements: robust, deterministic, preferred native implementation or hardened service.

Complementary services:


Services & responsibilities (concrete)
  - Simulates Zerodha MCP endpoints (login, get_holdings) for local dev.
  - Strategy Engine APIs: /status, /mcp/*, /suggestions, /jobs, /backtests
  - Lightweight orchestration and job enqueueing.
  - Background worker consuming Redis queue to run suggestion jobs, long running backtests, and ephemeral ML tasks.
  - Native process subscribing to market feed; emits signals on IPC bus.
  - Receives orders, enforces pre‑trade rules, sends to broker simulator or real broker.
  - Replay historical tick data to test pattern and strategy engines.

Note: In dev we run mock_mcp, backend and worker via docker-compose. The planned pattern_engine, execution, and tick_replay are to be added as separate services (with native code artifacts) and will be included in future compose orchestrations for integration testing.


Data model (core DB tables)
We use Postgres for persistent, authoritative records (not the hot path). Key tables:

  - id (string PK)
  - type (string) — e.g., suggestion, backtest
  - status (string) — queued, running, completed, failed
  - payload (json)
  - result (json)
  - error (text)
  - created_at, started_at, finished_at

  - id, username, role, created_at

  - id, user_id, token_encrypted, token_expires_at, created_at

  - id, job_id, metrics (json), timeseries_path

  - id, strategy_id, order_id, side, qty, price, status, created_at, filled_qty, fill_price

  - id, order_id, trade_id, qty, price, timestamp

Storage guidance:


Migrations & DB management (Alembic)

Apply migrations locally (docker compose running Postgres):

```bash
# ensure postgres is up
docker-compose up -d postgres
# initialize DB (creates tables via SQLAlchemy or run alembic)
docker-compose run --rm backend-initdb
# or with alembic installed in container you can run:
# docker-compose run --rm backend alembic upgrade head
```

For development we also provide `backend/core/db.init_db()` which creates tables directly from SQLAlchemy models (convenience only).


Run & dev commands
Start the dev stack (mock MCP + backend + Redis + Postgres + worker):

```bash
cp .env.example .env
docker-compose up --build
```

Initialize DB (if not using alembic):

```bash
docker-compose run --rm backend-initdb
```

Run only backend locally (outside container):

```bash
PYTHONPATH=. uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Run the worker locally:

```bash
PYTHONPATH=. python backend/workers/worker.py
```

Run unit tests:

```bash
PYTHONPATH=. pytest -q
```

Enqueue a job (shell test):

```bash
python - <<'PY'
from backend.services.job_runner import enqueue_job
import uuid
enqueue_job('suggestion', str(uuid.uuid4()), {'prompt':'scan my portfolio'})
PY
```


How to re‑plumb the backend (tasks & file structure)
This section lists concrete tasks and file layout to implement separation of Pattern and Strategy engines and to ensure DB persistence & migrations are used consistently.

Desired layout:

```
backend/
  api/
  core/
  models.py
  services/
    mcp_client.py
    llm_provider.py
    job_runner.py
  workers/
  strategy_engine/        # python strategy service
  pattern_engine/         # bridge to native pattern engine (IPC contracts)
```

Concrete replumb tasks (implementation plan):
1. Move existing FastAPI `backend` endpoints into `backend/api/` and ensure they only manage orchestration and user‑facing concerns.
2. Implement `backend/services/persistence.py` to read/write Jobs and Backtests via SQLAlchemy ORM. Replace Redis hset job metadata with DB writes. Keep Redis for queue only.
3. Implement Alembic migrations for all DB changes; maintain `alembic/versions` and run `alembic upgrade head` as part of CI or `backend-initdb` for dev.
4. Create `pattern_engine/` as a standalone native project with a protobuf/flatbuffer contract for signals. For dev, create a Python stub that publishes signals to Redis or nanomsg.
5. Strategy Engine (backend.strategy_engine): create a service that subscribes to the signal bus, fetches MCP account context, evaluates orders and enqueues them to OMS (or simulator) after pre‑trade checks.
6. Execution/OMS: implement in a hardened service; for dev use a simulator to accept orders and simulate fills.


Testing & CI notes


Next actionable steps (pick one)
1. I can implement `backend/services/persistence.py` and update `job_runner` to persist job rows in Postgres and only keep queue state in Redis (recommended next step).
2. I can scaffold `pattern_engine/` Python stub and a tick_replay server for integration testing.
3. I can add `pattern_engine` and `strategy_engine` services to `docker-compose` as stubs so we can run an end‑to‑end integration test locally.

Developer convenience
---------------------
To start a minimal local dev stack (Postgres, Redis, mock MCP), run:

```bash
./scripts/dev_up.sh
```

The script will:
- bring up `postgres`, `redis`, and `mock-mcp` via `docker-compose`;
- wait for Postgres readiness;
- run `./scripts/run_migrations.sh --fallback` (Alembic migrations; falls back to sqlite);
- bring up the remaining services (backend, worker, tick_replay, etc.).

Note: `docker` and `docker-compose` are required for `dev_up.sh` to run. If you prefer not to use Docker, use `scripts/init_db_dev.sh` and `scripts/start_pipeline.sh` to run the dev stack locally without containers.

Tell me which option you want me to implement next and I will create the files and run the dev stack to validate. If you prefer, I can start with option 1 (persistence) which is the minimal replumbing change to ensure the DB is authoritative for jobs/results.


Contact & notes

Local helper scripts
--------------------
To make it easier to run the local pipeline in development we've added a small set of helper scripts under `scripts/`:

- `scripts/run_migrations.sh` - runs Alembic migrations against the `DATABASE_URL` (defaults to `postgresql://postgres:postgres@localhost:5432/aitrader`).
- `scripts/start_pipeline.sh` - starts the native pattern engine (if built) and the Python pipeline services (book_builder, strategy, executor, tick_replay). Logs and PIDs are written to `/tmp/*.log` and `/tmp/*.pid`.
- `scripts/stop_pipeline.sh` - stops services started by `start_pipeline.sh` and prints recent log snippets.

Examples
--------
Apply DB migrations:

```bash
# ensure Postgres is running locally
scripts/run_migrations.sh
```

If you do not have Postgres available (or want a quick dev fallback), you can initialize the local SQLite dev DB directly:

```bash
scripts/init_db_dev.sh
# this creates tables in dev.db using SQLAlchemy models
```

Start the live dev pipeline (native pattern engine + python services):

```bash
scripts/start_pipeline.sh
# tail logs
tail -f /tmp/pattern_native.log /tmp/book_builder.log /tmp/strategy.log /tmp/executor.log /tmp/replay.log
```

Stop the pipeline:

```bash
scripts/stop_pipeline.sh
```

TensorRT support (optional)
---------------------------

If you have an NVIDIA GPU and want to try TensorRT as an alternate GPU execution path (useful when cuDNN/ONNX Runtime CUDA provider fails on certain convolution/pooling patterns), you can test quickly using an official NVIDIA TensorRT container image rather than installing TensorRT into the project image.

Quick test (recommended):

- Run an NVIDIA TensorRT base image and mount this repository into it. Inside the container you can run the small TRT runner scaffold at `tensorrt_runner/app.py` or use `scripts/build_trt_engine.py` to compile an engine and then run it with the scaffold.
- This avoids apt repository issues when attempting to add TensorRT packages to the `nvidia/cuda:...` base image.

Notes about Dockerfile and INSTALL_TRT build-arg:

- The project contains `Dockerfile.onnx_runner` with a conditional `INSTALL_TRT` build-arg. Attempts to install TensorRT packages via the NVIDIA apt machine-learning repository can fail if the repo path or package versions don't match the CUDA/Ubuntu combination on the host. If you prefer to bake TRT into the image for CI, you will need to identify the correct NVIDIA package repository and package versions that match your CUDA and driver stack.

Files and scripts:

- `scripts/build_trt_engine.py` — scaffold to convert ONNX -> TensorRT engine (requires Python `tensorrt` bindings in the container).
- `tensorrt_runner/app.py` — FastAPI scaffold to load and serve serialized TRT engines; it includes guard rails when TensorRT/PyCUDA are not available.

Recommended next steps:

1. Quick validation: run the NVIDIA TensorRT base image and try converting and running one of the exported ONNX models with the `scripts/build_trt_engine.py` script and `tensorrt_runner/app.py` runner.
2. If TRT works in the base image, either use that as the inference runtime in production or iterate on `Dockerfile.onnx_runner` to install the proper TRT runtime packages for your target CUDA/Ubuntu combination.

CI: TensorRT smoke job
----------------------

We provide a manual GitHub Actions workflow to run a TensorRT engine build + smoke test inside NVIDIA's official TensorRT container. This job is intended to run on a self-hosted runner that has:

- Docker installed and the NVIDIA Container Toolkit configured (so `docker run --gpus all` works).
- A compatible NVIDIA GPU and drivers matching the CUDA version used by the TensorRT container(s).

To run the job:

1. In the GitHub UI go to Actions → TRT CI (manual) → Run workflow. Choose the `main` branch (or your branch) and dispatch.
2. The job will build MLP and CNN engines and run the smoke scripts. Output and artifacts (serialized engines) will be uploaded.

Runner checklist (self-hosted):

- Ubuntu 20.04/22.04 (or similar)
- Docker >= 20.10
- NVIDIA drivers installed on host (matching CUDA in the container)
- NVIDIA Container Toolkit / nvidia-docker2 configured
- The runner host must have GPUs and be registered as a `self-hosted` runner in your repository or organization. Using labels (for example `gpu`) is recommended.

Note: The job is manual by design to avoid accidentally exhausting shared GPUs; you should only run it on machines you control.

Running the TRT vs CPU integration test locally
---------------------------------------------

If you want to run the TRT vs CPU comparison test locally (useful to validate
that TRT outputs match a CPU ONNXRuntime baseline), follow these steps:

1. Build TRT engines as shown in `pattern_engine/README.md` (or run the
  `scripts/build_trt_engine.py` inside the official TRT container).
2. Ensure you have a local Python environment with `onnxruntime` installed for CPU baseline.
3. Set the environment variable `TRT_CI=1` and run pytest for the specific test:

```bash
# from repo root
export TRT_CI=1
pytest -q tests/test_trt_vs_cpu.py
```

The test will skip the TRT comparison if no engine file or TRT runtime is present.

