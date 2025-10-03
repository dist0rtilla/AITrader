#!/usr/bin/env bash
set -euo pipefail
# production.sh - start complete production stack with all services

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "🚀 Starting Production Stack with All Services..."
echo "This will start the complete production environment including all ML services"
echo ""
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

echo "✅ Production stack started successfully!"
echo "🌐 Frontend: http://localhost:80"
echo "🔗 Backend API: http://localhost:8000" 
echo "📖 API Documentation: http://localhost:8000/docs"
echo "💹 Mock MCP: http://localhost:9000"
echo ""
echo "Use ./scripts/start_pipeline.sh to start additional local pipeline services if needed."
