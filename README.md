# AITrader — HFT-capable prototype with React control panel

This repository contains the AITrader project scaffold following the architecture specified in `docs/instructions/copilot-instructions.md`. We implement a dual‑path architecture supporting both AI day trading and low‑latency pattern/strategy execution pipeline suitable for scalping/arbitrage prototypes.

This README provides a high-level overview. For detailed documentation, see the [docs/](./docs/) directory.

**📋 Project Status**: See [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) for current implementation status.

## 📚 Documentation

All project documentation is centralized in the [docs/](./docs/) directory:
- **[📝 Changelog](./docs/CHANGELOG.md)** - **REQUIRED**: Update before making changes
- **[Development Guide](./docs/development/DEVELOPMENT.md)** - Fast frontend development options
- **[API Documentation](./docs/api/API_DOCUMENTATION.md)** - Predictions & Sentiment APIs
- **[Architecture Overview](./docs/architecture/SERVICE_MAP.md)** - System architecture and services
- **[Frontend Instructions](./docs/frontend/FRONTEND_INSTRUCTIONS.md)** - UI development guide
- **[Copilot Instructions](./docs/instructions/copilot-instructions.md)** - Development guidelines
 - **[Maintenance & Cleanup](./docs/MAINTENANCE.md)** - Developer maintenance tasks to reclaim disk and resources

### 🚨 **Development Workflow Requirement**
**Before making any changes, always update the [changelog](./docs/CHANGELOG.md) with a timestamped entry:**
```bash
# 1. Edit changelog first
vim docs/CHANGELOG.md

# 2. Add entry: [YYYY-MM-DD] - Brief description
# 3. Make your changes  
# 4. Commit changelog + changes together
```

Table of contents
- Design overview
- Services & responsibilities
- Data model (DB tables)
- Migration and DB management (Alembic)
- Dev & run commands (docker compose + local)
- How to re-plumb the backend (tasks & file structure)
- Testing & CI notes
- Next actions (prioritized)


Design overview
We separate the system into three logical tiers with clear responsibilities:

1. Pattern Engine (hot path)
   - Purpose: detect short‑term micro patterns and produce candidate signals (binary/compact messages).
   - Current: **Production-ready Python implementation** with asyncio, TensorRT/ONNX GPU acceleration, and Redis pub/sub for signal distribution.
   - Architecture: Fully functional with real-time pattern detection, state management, and low-latency inference pipeline.
   - Future optimization: Potential migration to Rust/C++ for ultra‑low latency if needed. Runs on streaming feed (tick-level).

2. Strategy Engine (decision & risk)
   - Purpose: consume signals + account context (MCP) and produce order decisions, sizing, and risk management. Accepts more compute; tolerates higher latency than Pattern Engine.
   - Implementation: Python/FastAPI service for rapid iteration, with critical pieces ported to native code if needed.

3. Execution/OMS (reliable order lifecycle)
   - Purpose: enforce authoritative risk controls, send orders to broker/exchange, handle confirmations and fills, provide audit trail and kill switches.
   - Requirements: robust, deterministic, preferred native implementation or hardened service.

Complementary services:


Services & responsibilities (concrete)
  - **Mock MCP Service**: Simulates broker API endpoints (login, holdings, positions, orders) for local development
  - **Strategy Engine**: APIs for /status, /mcp/*, /suggestions, /jobs, /backtests with ML integration
  - **Backend Service**: Lightweight orchestration and job enqueueing with FastAPI
  - **Worker Service**: Background worker consuming Redis queue for suggestion jobs, backtests, and ML tasks
  - **Pattern Engine**: Real-time pattern detection with ONNX/TensorRT GPU acceleration
  - **Execution Gateway**: Order processing with pre-trade rules and broker integration (simulator available)
  - Replay historical tick data to test pattern and strategy engines.

Note: In dev we run mock_mcp, backend and worker via docker compose. The pattern_engine, execution, and tick_replay services are available as Python implementations and included in docker compose for integration testing.


## Frontend — React Control Panel

The frontend is a professional React SPA with dark glass morphism design:

**� Design System**: See [DESIGN_SYSTEM.md](./docs/frontend/DESIGN_SYSTEM.md) for complete UI guidelines and guardrails.

**Quick Start:**
```bash
# Access the live frontend
http://localhost:8080  # (via Docker Compose - includes theme switcher)
```

## 🚀 **Development Options**

### **1. Local Development** (Fastest for UI work)
```bash
./hostexecs/quick-start.sh        # 0 seconds build, instant hot reload
# Available at: http://localhost:5173
```

### **2. Docker Frontend Development** (Consistent environment)
```bash
./hostexecs/dev-frontend.sh       # ~30s one-time build, instant file changes
# Available at: http://localhost:8080
```

### **3. Full Stack Development** (Complete system)
```bash
./hostexecs/dev-fullstack.sh      # Complete backend + frontend stack
# Available at: http://localhost:8080 (Frontend), http://localhost:8000 (API)
```

### **Production Deployment**
```bash
./hostexecs/production.sh         # Production-ready stack
# Available at: http://localhost:80 (Frontend), http://localhost:8000 (API)
```

## 🐳 **Docker Compose Usage Guide**

Choose the right compose file for your development scenario:

### **Frontend Development Only** (Recommended for UI work)
```bash
./hostexecs/dev-frontend.sh       # Uses docker compose.frontend-only.yml
# Available at: http://localhost:8080
```

### **Full Development Stack** (Backend + Frontend)
```bash
./hostexecs/dev-fullstack.sh      # Uses docker compose.dev-fullstack.yml
# Frontend: http://localhost:8080, Backend API: http://localhost:8000
```

### **Complete Production Stack** (All Services)
```bash
./hostexecs/production.sh         # Uses docker compose.production.yml
# Frontend: http://localhost:80, Backend API: http://localhost:8000
# Complete service architecture including Mock MCP on port 9000
```

## 📋 Docker Compose File Guide

| File | Purpose | Use Case |
|------|---------|----------|
| `docker compose.frontend-only.yml` | Frontend development only | UI work, fast iteration (port 8080) |
| `docker compose.dev-fullstack.yml` | Full development stack | Backend + frontend development (port 8080) |
| `docker compose.production.yml` | Complete production stack | All services, integration testing (port 80) |
| `docker compose.gpu.yml` | GPU-enabled services | TensorRT, CUDA acceleration |
| `docker compose.local.override.yml` | Local overrides | Custom local configuration |
| `docker compose.nohostports.yml` | No host port mapping | Container-only networking |

**💡 Recommendation**: 
- For **fastest iteration**: Use `./hostexecs/quick-start.sh` (local development, port 5173)
- For **UI development**: Use `./hostexecs/dev-frontend.sh` (Docker with hot reload, port 8080)
- For **full stack development**: Use `./hostexecs/dev-fullstack.sh` (complete stack, ports 8080/8000)
- For **production testing**: Use `./hostexecs/production.sh` (all services, port 80)

## 📚 Quick Reference

- **[🚀 Development Guide](docs/development/DEVELOPMENT.md)** - Detailed development setup options
- **[🏗️ Backend README](backend/README.md)** - Backend service documentation  
- **[🎨 Frontend Guide](docs/frontend/FRONTEND_INSTRUCTIONS.md)** - UI development instructions
- **[⚡ TensorRT Setup](docs/advanced/TENSORRT.md)** - GPU acceleration guide
- **[📋 Project Status](docs/PROJECT_STATUS.md)** - Current implementation status

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
docker compose up -d postgres
# initialize DB (creates tables via SQLAlchemy or run alembic)
docker compose run --rm backend-initdb
# or with alembic installed in container you can run:
# docker compose run --rm backend alembic upgrade head
```

For development we also provide `backend/core/db.init_db()` which creates tables directly from SQLAlchemy models (convenience only).


Run & dev commands
Start the dev stack (mock MCP + backend + Redis + Postgres + worker):

```bash
cp .env.example .env
# Optional: Validate environment setup
python3 scripts/check_env.py
docker compose up --build
```

Initialize DB (if not using alembic):

```bash
docker compose run --rm backend-initdb
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
  pattern_engine/         # Python pattern engine service (future Rust migration planned)
```

Concrete replumb tasks (implementation plan):
1. Move existing FastAPI `backend` endpoints into `backend/api/` and ensure they only manage orchestration and user‑facing concerns.
2. Implement `backend/services/persistence.py` to read/write Jobs and Backtests via SQLAlchemy ORM. Replace Redis hset job metadata with DB writes. Keep Redis for queue only.
3. Implement Alembic migrations for all DB changes; maintain `alembic/versions` and run `alembic upgrade head` as part of CI or `backend-initdb` for dev.
4. The `pattern_engine/` Python implementation is fully functional and publishes signals to Redis Streams. Future optimization: migrate to Rust for ultra-low latency.
5. Strategy Engine (backend.strategy_engine): create a service that subscribes to the signal bus, fetches MCP account context, evaluates orders and enqueues them to OMS (or simulator) after pre‑trade checks.
6. Execution/OMS: implement in a hardened service; for dev use a simulator to accept orders and simulate fills.


Testing & CI notes


Next actionable steps (pick one)
1. I can implement `backend/services/persistence.py` and update `job_runner` to persist job rows in Postgres and only keep queue state in Redis (recommended next step).
2. I can scaffold `pattern_engine/` Python stub and a tick_replay server for integration testing.
3. I can add `pattern_engine` and `strategy_engine` services to `docker compose` as stubs so we can run an end‑to‑end integration test locally.

Developer convenience
---------------------
To start a minimal local dev stack (Postgres, Redis, mock MCP), run:

```bash
./scripts/dev_up.sh
```

The script will:
- bring up `postgres`, `redis`, and `mock-mcp` via `docker compose`;
- wait for Postgres readiness;
- run `./scripts/run_migrations.sh --fallback` (Alembic migrations; falls back to sqlite);
- bring up the remaining services (backend, worker, tick_replay, etc.).

Note: `docker` and `docker compose` are required for `dev_up.sh` to run. If you prefer not to use Docker, use `scripts/init_db_dev.sh` and `scripts/start_pipeline.sh` to run the dev stack locally without containers.

Tell me which option you want me to implement next and I will create the files and run the dev stack to validate. If you prefer, I can start with option 1 (persistence) which is the minimal replumbing change to ensure the DB is authoritative for jobs/results.


Contact & notes

Local helper scripts
--------------------
To make it easier to run the local pipeline in development we've added a small set of helper scripts under `scripts/`:

- `scripts/run_migrations.sh` - runs Alembic migrations against the `DATABASE_URL` (defaults to `postgresql://postgres:postgres@localhost:5432/aitrader`).
- `scripts/start_pipeline.sh` - starts the Python pattern engine and other pipeline services (book_builder, strategy, executor, tick_replay). Logs and PIDs are written to `/tmp/*.log` and `/tmp/*.pid`.
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

Start the live dev pipeline (Python pattern engine + other services):

```bash
scripts/start_pipeline.sh
# tail logs
tail -f /tmp/pattern_engine.log /tmp/book_builder.log /tmp/strategy.log /tmp/executor.log /tmp/replay.log
```

Stop the pipeline:

```bash
scripts/stop_pipeline.sh
```

## ⚡ Advanced Topics

### TensorRT GPU Acceleration
For production high-frequency trading with microsecond latency requirements, TensorRT provides significant performance improvements over standard ONNX Runtime.

**📚 See [TensorRT Integration Guide](docs/advanced/TENSORRT.md) for:**
- Setup and installation instructions
- Model conversion pipeline  
- Performance optimization techniques
- Production deployment strategies
- Troubleshooting and benchmarks

### Additional Advanced Topics
- **GPU Setup**: CUDA environment configuration
- **CI/CD Integration**: Automated testing and deployment
- **Performance Tuning**: Latency optimization strategies
- **Production Deployment**: Scaling and monitoring

