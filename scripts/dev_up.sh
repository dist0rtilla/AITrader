#!/usr/bin/env bash
set -euo pipefail
# dev_up.sh - start minimal compose (postgres, redis, mock-mcp), run migrations, then start remaining services

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Bringing up minimal services: postgres, redis, mock-mcp"
if ! command -v docker >/dev/null 2>&1 || ! command -v docker-compose >/dev/null 2>&1; then
  echo "docker/docker-compose not found. Please install docker and docker-compose to use this script."
  exit 1
fi

docker-compose up -d postgres redis mock-mcp

echo "Waiting for Postgres to be ready (pg_isready inside container)"
for i in {1..30}; do
  if docker exec $(docker-compose ps -q postgres) pg_isready -U postgres >/dev/null 2>&1; then
    echo "Postgres ready"
    break
  fi
  echo -n '.'; sleep 1
done

if [ $i -eq 30 ]; then
  echo "Postgres did not become ready in time; check docker-compose logs postgres" >&2
fi

echo "Running migrations (will fallback to sqlite dev DB on failure)"
./scripts/run_migrations.sh --fallback

echo "Bringing up remaining services"
docker-compose up -d backend worker tick_replay book_builder pattern_engine strategy_engine execution_simulator

echo "Dev stack started. Use ./scripts/start_pipeline.sh to start local native+python pipeline (if desired)."
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting Postgres via docker-compose..."
docker compose up -d db

echo "Waiting for Postgres to accept connections on localhost:5432..."
check_ready() {
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h localhost -p 5432 >/dev/null 2>&1
    return $?
  fi
  # fallback: try TCP connect with python
  python3 - <<PY >/dev/null 2>&1 || true
import socket
s = socket.socket()
try:
    s.settimeout(1.0)
    s.connect(('127.0.0.1', 5432))
    s.close()
    raise SystemExit(0)
except Exception:
    raise SystemExit(1)
PY
  return $?
}

for i in {1..60}; do
  if check_ready; then
    echo "Postgres is ready"
    break
  fi
  sleep 1
done

if ! check_ready; then
  echo "Postgres did not become ready in time" >&2
  exit 1
fi

# Bootstrap schema (trades table)
if [ -x "$ROOT_DIR/scripts/bootstrap_db.sh" ]; then
  echo "Bootstrapping database schema..."
  "$ROOT_DIR/scripts/bootstrap_db.sh"
else
  echo "Bootstrap script not found or not executable: $ROOT_DIR/scripts/bootstrap_db.sh"
fi

echo "Dev Postgres stack is up and schema bootstrapped."
