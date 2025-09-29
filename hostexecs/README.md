# hostexecs — Host-side helper scripts

This directory is the authoritative location for shell helper scripts used to build, run, and manage the AITrader development environment on a developer host.

Why hostexecs?
- Scripts are used to orchestrate local docker-compose runs, quick local development flows, and helper tasks (migrations, pipeline startup). Centralizing them makes it easier to mount them to containers, keep CI stable, and intentionally version the developer-facing hooks.

Conventions
- All helper scripts should live in `hostexecs/` and be executable (`chmod +x hostexecs/*.sh`).
- `scripts/` is retained for historical compatibility, but `hostexecs/` is the canonical source. New scripts should only be added to `hostexecs/`.
- If a script must run inside a container, it should detect a container environment and delegate appropriately.

Common scripts
- `hostexecs/quick-start.sh` — Local single-command dev start (fast frontend, hot reload)
- `hostexecs/dev-frontend.sh` — Docker-based frontend dev
- `hostexecs/dev-fullstack.sh` — Bring up full stack with docker-compose
- `hostexecs/production.sh` — Production compose stack
- `hostexecs/run_migrations.sh` — Run alembic migrations (wraps containerized invocation)

Migration from `scripts/`
- Many scripts exist in the legacy `scripts/` directory. We keep these for backward compatibility but recommend updating references to point to `hostexecs/`.
- To migrate: move or symlink scripts to `hostexecs/` and update README/docs to reference `hostexecs/`.

Best practices
- Keep scripts idempotent where possible.
- Avoid heavy logic in shell — call small python utilities under `scripts/` if more complex work is required.
- Document changes to helper scripts in `docs/` and `CHANGELOG.md`.

