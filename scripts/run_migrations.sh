#!/usr/bin/env bash
set -euo pipefail
# run_migrations.sh - run alembic upgrade head against DATABASE_URL

DEFAULT_DB=${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/aitrader}
DATABASE_URL=${DATABASE_URL:-$DEFAULT_DB}

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
export PYTHONPATH="${REPO_ROOT}:${PYTHONPATH:-}"

FALLBACK=0
if [ "${1:-}" = "--fallback" ]; then
  FALLBACK=1
fi

echo "Checking DB connectivity for $DATABASE_URL"
if python3 -c "from urllib.parse import urlparse; import os; u = urlparse(os.environ.get('DATABASE_URL','%s')); print('host:%s port:%s' % (u.hostname or 'localhost', u.port or 5432))"; then
  true
else
  echo "Python failed to run for DB check"
fi

if ! command -v alembic >/dev/null 2>&1; then
  echo "alembic not found in PATH. Install requirements: pip install -r requirements.txt"
  exit 1
fi

echo "Running alembic migrations against $DATABASE_URL"
export DATABASE_URL="$DATABASE_URL"
if alembic upgrade head; then
  echo "Migrations applied."
  exit 0
else
  echo "Alembic failed to apply migrations."
  if [ "$FALLBACK" -eq 1 ]; then
    echo "Fallback requested: running init_db_dev.sh with sqlite dev DB"
    DATABASE_URL="sqlite:///dev.db" ./scripts/init_db_dev.sh
    exit 0
  else
    echo "Run './scripts/run_migrations.sh --fallback' to use sqlite dev fallback, or fix Postgres credentials." >&2
    exit 1
  fi
fi
