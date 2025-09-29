#!/usr/bin/env bash
set -euo pipefail
# Build the native Rust pattern engine (cargo build --release)
# NOTE: Rust implementation is not yet available - using Python implementation

echo "⚠️  Rust Pattern Engine implementation is not yet available"
echo "Current implementation: Python (pattern_engine/pattern_detector.py)"
echo "Future: Rust implementation for ultra-low latency"
echo ""
echo "To run current Python implementation:"
echo "  docker compose up pattern_engine"
echo ""
exit 1  # Exit since Rust implementation doesn't exist yet

# TODO: Uncomment when Rust implementation is available
# REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# cd "$REPO_ROOT/pattern_engine/native"
# 
# echo "Building native pattern engine (release)"
# if ! command -v cargo >/dev/null 2>&1; then
#   echo "cargo not found. Install Rust toolchain (rustup) first."
#   exit 1
# fi

cargo build --release

BINARY="$REPO_ROOT/pattern_engine/native/target/release/pattern_engine_native"
if [ -x "$BINARY" ]; then
  echo "Built: $BINARY"
else
  echo "Build finished but binary missing: $BINARY"
  exit 2
fi
