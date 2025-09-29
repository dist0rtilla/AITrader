#!/usr/bin/env bash
# Shim: delegate to /hostexecs/dev-docker.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/dev-docker.sh" "$@"