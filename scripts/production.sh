#!/usr/bin/env bash
# Shim: delegate to /hostexecs/production.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/production.sh" "$@"
