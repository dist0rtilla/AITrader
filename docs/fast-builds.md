Fast builds and faster local dev for AITrader

Goal
- Reduce iterations when building/running the local dev stack (frontend + pattern_engine + backend) by minimizing build contexts, reusing caches, and running only necessary services.

Quick checklist (fast path)
1. Start only required services for UI development:
   - postgres, redis, mock-mcp, backend, pattern_engine, frontend
   - Use the minimal production/dev script: `scripts/dev_up.sh` (it brings up postgres, redis, mock-mcp)
2. Use compose selectively to build only what's necessary:
   - docker compose -f docker-compose.dev-fullstack.yml up -d --build backend pattern_engine frontend
   - To avoid rebuilding large images like mock-mcp or backend when not necessary, omit them from --build.
3. Prefer using already-built images when iterating on frontend only:
   - docker compose -f docker-compose.dev-fullstack.yml up -d frontend

Docker build context optimization
- Large build times are often caused by sending a large build context to Docker (e.g., copying 7+ GB). Check which folders are being transferred and exclude them with .dockerignore.
- Use BuildKit (enabled by default on recent Docker) and the BuildKit cache. Example:
  DOCKER_BUILDKIT=1 docker compose -f docker-compose.dev-fullstack.yml build frontend

Recommended .dockerignore additions (fast local iteration)
- Add the following entries to the top-level `.dockerignore` to significantly reduce build context size:
  node_modules
  **/node_modules
  **/.git
  **/.venv
  **/.cache
  pattern_engine/onnx/
  models/
  **/tests/
  **/*.pyc
  **/__pycache__/
  frontend/dist/
  frontend/node_modules/
  .venv/
  env/
  .pytest_cache/

Use named volumes for frontend node_modules
- The `frontend` dev container uses mounts which can hide the container's node_modules. Use a named volume to persist node_modules inside container and avoid re-running npm ci on every restart.
- Example docker-compose override snippet for faster dev iteration:
  frontend:
    volumes:
      - ./frontend/src:/app/src:ro
      - ./frontend/public:/app/public:ro
      - frontend_node_modules:/app/node_modules

  volumes:
    frontend_node_modules:

Cache and rebuild tips
- When making changes only to frontend code, don't rebuild backend or pattern_engine:
  docker compose -f docker-compose.dev-fullstack.yml up -d frontend
- When rebuilding, prefer `docker compose build --pull --parallel` to parallelize builds.

Development workflow recommendations
- Use the host Vite dev server for very fast UI iteration (hot reload). This avoids building the frontend image entirely. Example:
  cd frontend
  npm ci
  npm run dev -- --host 0.0.0.0 --port 8080

- Use the containerized frontend only when testing mount behaviors and production-like env vars.

CI-friendly tips
- Push built frontend images to a local registry or use docker buildx with cache export/import to share caches across runs.

Troubleshooting
- If docker compose fails with "address already in use", make sure no local dev servers are binding the port (e.g., Vite). Kill local processes or change the host port in compose.
- Use `docker builder prune --filter until=24h` to remove stale caches older than a day if disk space is a problem.

Appendix: Useful commands
- Build only frontend image (using BuildKit):
  DOCKER_BUILDKIT=1 docker compose -f docker-compose.dev-fullstack.yml build frontend

- Start minimal services for UI dev (no rebuild):
  docker compose -f docker-compose.dev-fullstack.yml up -d postgres redis mock-mcp backend
  docker compose -f docker-compose.dev-fullstack.yml up -d frontend

- Start host dev Vite (fastest):
  cd frontend
  npm ci
  npm run dev -- --host 0.0.0.0 --port 8080

