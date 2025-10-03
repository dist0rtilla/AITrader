#!/usr/bin/env bash
set -euo pipefail
# dev_up.sh - start minimal compose (postgres, redis, mock-mcp), run migrations, then start remaining services

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Bringing up minimal services: postgres, redis, mock-mcp"
if ! command -v docker >/dev/null 2>&1 || ! command -v docker compose >/dev/null 2>&1; then
  echo "docker/docker compose not found. Please install docker and docker compose to use this script."
  exit 1
fi

# Use production compose file for full service stack
docker compose -f docker-compose.production.yml up -d postgres redis mock-mcp

echo "Waiting for Postgres to be ready (pg_isready inside container)"
for i in {1..30}; do
  if docker exec $(docker compose -f docker-compose.production.yml ps -q postgres) pg_isready -U postgres >/dev/null 2>&1; then
    echo "Postgres ready"
    break
  fi
  echo -n '.'; sleep 1
done

if [ $i -eq 30 ]; then
  echo "Postgres did not become ready in time; check docker compose logs postgres" >&2
fi

echo "Running migrations (will fallback to sqlite dev DB on failure)"
./scripts/run_migrations.sh --fallback

echo "Bringing up remaining services"
docker compose -f docker-compose.production.yml up -d backend worker tick_replay book_builder pattern_engine strategy_engine execution_simulator

echo "Dev stack started. Use ./scripts/start_pipeline.sh to start local native+python pipeline (if desired)."
