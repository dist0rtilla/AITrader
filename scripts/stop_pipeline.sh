#!/usr/bin/env bash
set -euo pipefail
# stop_pipeline.sh - stop native pattern engine + python pipeline services

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

log() { echo "[$(date -Iseconds)] $*"; }

log "Stopping pipeline (if running)"

for pf in /tmp/pattern_native.pid /tmp/book_builder.pid /tmp/strategy.pid /tmp/executor.pid /tmp/replay.pid; do
  if [ -f "$pf" ]; then
    pid=$(cat "$pf")
    if kill -0 "$pid" 2>/dev/null; then
      log "Killing $pid (from $pf)"
      kill "$pid" || true
      sleep 0.2
      if kill -0 "$pid" 2>/dev/null; then
        log "PID $pid still alive, forcing"
        kill -9 "$pid" || true
      fi
    else
      log "PID $pid not running"
    fi
    rm -f "$pf"
  fi
done

log "Stopped. Recent log snippets:"
for lf in /tmp/pattern_native.log /tmp/book_builder.log /tmp/strategy.log /tmp/executor.log /tmp/replay.log; do
  if [ -f "$lf" ]; then
    echo "--- $lf (last 40 lines) ---"
    tail -n 40 "$lf" || true
  fi
done

log "Cleanup complete."
