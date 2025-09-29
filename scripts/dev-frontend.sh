#!/usr/bin/env bash
# Shim: delegate to /hostexecs/dev-frontend.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/dev-frontend.sh" "$@"