MCP Server — hostexecs Integration Guide

Purpose

This document describes a minimal, practical Machine Context Protocol (MCP) server setup that integrates with this repository's host-side helper scripts under `./hostexecs/`.

Goal

- Provide step-by-step instructions to run an MCP server for local development and lightweight production testing.
- Explain which hostexecs scripts help with lifecycle tasks (start/stop/build/check) and how to wire environment variables, logging, telemetry, and optional model handling.
- Include recommended Docker Compose snippets and troubleshooting tips.

Audience

Developers who need to run the MCP server locally or in a small staging environment and operations engineers who want a repeatable, documented setup for CI jobs.

Ensure

- You're working from the repository root (`/home/trader/trading-ai`).
- `./hostexecs/` is the canonical location for shell helper scripts (it contains scripts such as `dev-quick.sh`, `dev-docker.sh`, `build-optimized.sh`, `check_links.sh`, `validate_ports.sh`, etc.).
- Docker & Docker Compose are available if you want containerized operation.

Files referenced

- `hostexecs/dev-quick.sh` — fast local development runner
- `hostexecs/dev-docker.sh` — docker-based dev environment with hot reload
- `hostexecs/build-optimized.sh` — production build helper
- `hostexecs/check_links.sh`, `hostexecs/validate_ports.sh` — documentation CI helpers
- `pattern_engine/` — the Rust pattern engine (MCP-capable component)
- `mock_mcp/` — local mock MCP server (if present)

Quickstart — Local (dev) MCP server

1. Prepare environment

- Ensure the usual dev services are available (Redis, Postgres if using the DB-backed features). If you prefer to use Docker for those services, use the `dev-docker` helper below.

2. Run the fast local dev runner

From the repository root:

```bash
# make hostexecs scripts executable if needed
chmod +x ./hostexecs/*.sh

# Run quick dev stack which may start a lightweight MCP server or pattern_engine dev runner
./hostexecs/dev-quick.sh
```

Note: `dev-quick.sh` is intentionally the fastest path: it runs the minimal set of services required for frontend UI + local MCP-like endpoints to talk to the engine.

Quickstart — Docker Compose (recommended for parity)

A minimal compose snippet you can add to `docker-compose.override.yml` for local testing:

```yaml
version: '3.7'
services:
  redis:
    image: redis:7
    ports:
      - '6379:6379'

  mcp-server:
    build: ./pattern_engine
    working_dir: /app
    command: ["./pattern_engine", "--serve-mcp"]
    environment:
      - MODEL_PATH=/models/pattern_model.onnx
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./models:/models:ro
    depends_on:
      - redis
    ports:
      - "9000:9000"  # MCP server port (example)
```

Start with:

```bash
docker compose -f docker-compose.override.yml up --build
```

Model path and loading

- The Rust engine uses `MODEL_PATH` environment variable (default: `models/pattern_model.onnx`) — make sure it points at a valid ONNX model if you want ML fallback inference.
- If you don't have a model available, the engine runs a deterministic stubbed inference (development-friendly).

Environment variables (recommended)

- MODEL_PATH — path to ONNX model file (optional for dev)
- REDIS_URL — connection string for Redis (used by the publisher)
- LOG_LEVEL — `info`, `debug`, `warn`, etc. (affects engine and host scripts that respect it)
- MCP_BIND — address:port to bind MCP server

hostexecs helper usage

- `./hostexecs/dev-quick.sh` — lightweight dev run (good for local iterative development)
- `./hostexecs/dev-docker.sh` — spins up docker compose-based dev stack (with volumes & hot reload)
- `./hostexecs/build-optimized.sh` — run production build tasks (frontend+backend packaging)
- `./hostexecs/check_links.sh`, `./hostexecs/validate_ports.sh` — CI doc checks and port validation

Exposing metrics & telemetry

- The Rust pattern engine exposes `/metrics` (JSON currently in this repo). If you want Prometheus scrape format, either:
  - Add a small exporter that converts JSON -> Prometheus text format, or
  - Integrate `prometheus` crate in the engine and expose the standard text format.
- Hostexecs can be used inside CI to validate service health and gather metrics snapshots before a release.

Logging & debugging

- Inspect logs from the engine and helper services (systemd/journalctl or Docker logs). Example:

```bash
# When running with docker compose
docker compose logs mcp-server

# Locally
tail -f /path/to/pattern_engine/logs/*.log
```

Troubleshooting

- Ports already in use: run `./hostexecs/validate_ports.sh` or run `fuser -k <port>/tcp` (careful with destructive kills)
- Missing model file: ensure `MODEL_PATH` points to a valid file or rely on the dev stub; CI builds should fail fast when model is required.
- Redis connection errors: set `REDIS_URL` and ensure the service is reachable. Use `redis-cli -h <host> -p <port> ping`.

CI integration ideas

- In CI, prefer `./hostexecs/check_links.sh` and `./hostexecs/validate_ports.sh` to keep docs linting and port assignment checks consistent.
- To run MCP-related smoke tests in CI:
  1. Start a small redis service (or use a managed test redis).
  2. Build and run the `pattern_engine` binary with a dev model stub or a tiny test model.
  3. Run HTTP/smoke tests against `/health` and `/metrics` and any MCP endpoints you expose.

Next steps & extensions

- Convert `/metrics` to Prometheus text format or integrate Prometheus client crate for richer telemetry.
- Add an optional S3-backed model download flow inside `hostexecs` so CI can fetch a model artifact before tests.
- Add example client snippets (Python/JS) that show how to publish ticks and receive signals via MCP/Redis streams.

Change log

- 2025-09-29 — Initial MCP_SERVER.md created (hostexecs-centric)

---

If you'd like, I can: (A) add a sample MCP client snippet (Python or JS), (B) implement a Prometheus metrics exporter in Rust, or (C) add a small CI job YAML to run the smoke tests above. Tell me which and I'll add it next.
