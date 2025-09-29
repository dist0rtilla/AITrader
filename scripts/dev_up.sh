#!/usr/bin/env bash
# Shim: delegate to /hostexecs/dev_up.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/dev_up.sh" "$@"
