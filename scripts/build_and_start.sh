#!/usr/bin/env bash
set -euo pipefail
# build_and_start.sh - build native pattern engine then start pipeline

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Building native engine"
./scripts/build_native.sh

echo "Stopping existing pipeline (if any)"
if [ -x ./scripts/stop_pipeline.sh ]; then
  ./scripts/stop_pipeline.sh || true
fi

echo "Starting pipeline"
./scripts/start_pipeline.sh

echo "Tailing logs (Ctrl-C to exit)"
tail -n 200 /tmp/pattern_native.log /tmp/book_builder.log /tmp/strategy.log /tmp/executor.log /tmp/replay.log || true
