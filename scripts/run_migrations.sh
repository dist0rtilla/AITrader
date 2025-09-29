#!/usr/bin/env bash
# Shim: delegate to /hostexecs/run_migrations.sh
exec "$(cd "$(dirname "$0")/.." && pwd)/hostexecs/run_migrations.sh" "$@"
