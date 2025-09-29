#!/usr/bin/env bash
# Shim: delegate to /hostexecs/dev-quick.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/dev-quick.sh" "$@"