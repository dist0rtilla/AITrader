#!/usr/bin/env bash
# Shim: delegate to /hostexecs/build-optimized.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/build-optimized.sh" "$@"