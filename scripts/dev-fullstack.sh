#!/usr/bin/env bash
# Shim: delegate to /hostexecs/dev-fullstack.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/dev-fullstack.sh" "$@"