#!/usr/bin/env bash
set -euo pipefail

# Fast dev helper for AITrader
# Usage:
#   ./scripts/fast_dev.sh [--apply-dockerignore]
#
# By default this will spin up minimal services (postgres, redis, mock-mcp, backend)
# and the frontend dev container using docker-compose.fast.yml which uses a
# named volume for frontend node_modules.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.dev-fullstack.yml"
FAST_COMPOSE="$ROOT_DIR/docker-compose.fast.yml"

if [[ "${1:-}" == "--apply-dockerignore" ]]; then
  echo "Applying .dockerignore.fast -> .dockerignore (backup to .dockerignore.bak)"
  cp "$ROOT_DIR/.dockerignore" "$ROOT_DIR/.dockerignore.bak"
  cat "$ROOT_DIR/.dockerignore.fast" >> "$ROOT_DIR/.dockerignore"
fi

echo "Starting minimal infra: postgres redis mock-mcp backend"
docker compose -f "$COMPOSE_FILE" up -d postgres redis mock-mcp backend

echo "Starting frontend (fast compose override)"
docker compose -f "$COMPOSE_FILE" -f "$FAST_COMPOSE" up -d --build frontend

echo "Done. Frontend: http://localhost:8080/"
