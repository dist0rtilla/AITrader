#!/usr/bin/env bash
set -euo pipefail
# start_pipeline.sh - start native pattern engine + python pipeline services
# Usage: bash scripts/start_pipeline.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REDIS_URL=${REDIS_URL:-redis://127.0.0.1:6379/0}

log() { echo "[$(date -Iseconds)] $*"; }

log "Starting pipeline with REDIS_URL=${REDIS_URL} (repo: ${REPO_ROOT})"

# Check Redis reachability before starting
check_redis() {
  echo "Checking Redis at ${REDIS_URL}"
  for i in {1..10}; do
    if python3 - <<PY >/dev/null 2>&1
from urllib.parse import urlparse
import redis, os
u = urlparse(os.environ.get('REDIS_URL','${REDIS_URL}'))
host = u.hostname or '127.0.0.1'
port = u.port or 6379
try:
    r = redis.Redis(host=host, port=port, socket_connect_timeout=1)
    r.ping()
    print('OK')
except Exception as e:
    raise SystemExit(1)
PY
then
      echo "Redis reachable"
      return 0
    else
      echo -n '.'; sleep 1
    fi
  done
  echo "\nRedis not reachable at ${REDIS_URL}. Aborting start." >&2
  return 1
}

if ! check_redis; then
  exit 1
fi

# Native binary
NATIVE_BIN="$REPO_ROOT/pattern_engine/native/target/release/pattern_engine_native"
if [ -x "$NATIVE_BIN" ]; then
  log "Starting native pattern engine -> /tmp/pattern_native.log"
  REDIS_URL="$REDIS_URL" nohup "$NATIVE_BIN" > /tmp/pattern_native.log 2>&1 &
  echo $! > /tmp/pattern_native.pid
else
  log "Warning: native binary not found or not executable: $NATIVE_BIN"
fi

# Helper to start a Python service
start_py() {
  local script="$1" pidfile="$2" logfile="$3"
  if [ -f "$script" ]; then
    log "Starting $script -> ${logfile}"
    REDIS_URL="$REDIS_URL" nohup python3 "$script" > "$logfile" 2>&1 &
    echo $! > "$pidfile"
  else
    log "Missing script: $script"
  fi
}

start_py "$REPO_ROOT/market_data/book_builder.py" /tmp/book_builder.pid /tmp/book_builder.log
start_py "$REPO_ROOT/strategy_engine/strategy_service.py" /tmp/strategy.pid /tmp/strategy.log
start_py "$REPO_ROOT/execution_gateway/simulator.py" /tmp/executor.pid /tmp/executor.log
start_py "$REPO_ROOT/market_data/tick_replay.py" /tmp/replay.pid /tmp/replay.log

log "Started services. PIDs:"
for pf in /tmp/pattern_native.pid /tmp/book_builder.pid /tmp/strategy.pid /tmp/executor.pid /tmp/replay.pid; do
  if [ -f "$pf" ]; then
    printf "%s: %s\n" "$pf" "$(cat $pf)"
  fi
done

log "Tailing recent logs (press Ctrl-C to stop)"
for lf in /tmp/pattern_native.log /tmp/book_builder.log /tmp/strategy.log /tmp/executor.log /tmp/replay.log; do
  if [ -f "$lf" ]; then
    echo "--- $lf ---"
    tail -n 20 "$lf" || true
  fi
done

log "Pipeline start complete. Use scripts/stop_pipeline.sh to stop."
