#!/usr/bin/env bash
set -euo pipefail
# init_db_dev.sh - initialize DB using backend.core.db.init_db (uses DATABASE_URL or sqlite dev.db)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Initializing DB via SQLAlchemy models (this will create tables in DATABASE_URL or sqlite:///dev.db)"
PYTHONPATH="$REPO_ROOT" python3 - <<'PY'
from backend.core.db import init_db
print('Running init_db()')
init_db()
print('DB initialized')
PY

echo "Done."
