#!/usr/bin/env bash
# Shim: delegate to /hostexecs/quick-start.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/quick-start.sh" "$@"