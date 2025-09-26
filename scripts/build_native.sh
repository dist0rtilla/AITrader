#!/usr/bin/env bash
set -euo pipefail
# Build the native Rust pattern engine (cargo build --release)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/pattern_engine/native"

echo "Building native pattern engine (release)"
if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo not found. Install Rust toolchain (rustup) first."
  exit 1
fi

cargo build --release

BINARY="$REPO_ROOT/pattern_engine/native/target/release/pattern_engine_native"
if [ -x "$BINARY" ]; then
  echo "Built: $BINARY"
else
  echo "Build finished but binary missing: $BINARY"
  exit 2
fi
