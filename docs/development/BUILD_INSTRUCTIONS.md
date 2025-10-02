Build Instructions — Frontend (reproducible)

This file documents the exact commands and troubleshooting steps to build the frontend reproducibly (locally or inside Docker). Follow these steps to avoid stale or broken images and to make the Docker build deterministic.

Intent
- Ensure the `frontend` project builds reliably inside Docker (multi-stage) and that nginx serves the built `dist/` with a valid `index.html` that references the generated assets. **It is always served on 80 and/or 443 only.**

Prerequisites
- Docker and Docker Compose installed and working on the host.
- **Ports 80/443** and any backend ports (e.g., 8000, 6379) are free for compose to bind.

## 📝 **IMPORTANT: Changelog Maintenance**

**Before making any changes, always update the changelog:**

```bash
# Edit the changelog first
vim docs/CHANGELOG.md

# Add your changes under [Unreleased] section with timestamp
# Format: [YYYY-MM-DD] - Brief Description
```

**Required for:**
- ✅ New features or services
- ✅ Bug fixes and configuration changes
- ✅ Documentation updates
- ✅ Build process modifications
- ✅ Before creating pull requests

**See [docs/CHANGELOG.md](../CHANGELOG.md) for detailed guidelines.**

## 🚀 **NEW: Fast Development Workflows (Recommended)**

### **Super Fast Local Development** (0 seconds build time)
```bash
./hostexecs/dev-quick.sh
# Available at: http://localhost:5173
# ✅ Instant hot reload, fastest iteration
```

### **Docker Development with Hot Reload** (~30 seconds one-time)
```bash
./hostexecs/dev-docker.sh
# Available at: http://localhost:8080
# ✅ Consistent environment, instant file changes
```

### **Optimized Production Build** (~70s first, ~30s subsequent)
```bash
./hostexecs/build-optimized.sh
# Available at: http://localhost:8080
# ✅ 35%+ faster builds with advanced caching
```

## Traditional Docker Workflow (if needed)

1. Stop any local dev services that may conflict:

```bash
# stop local services using common ports (example)
sudo systemctl stop redis.service || true
# stop any local uvicorn/fastapi running on 8000
fuser -k 8000/tcp || true
```

2. From the repo root, do a clean build inside Docker (this uses the multi-stage `Dockerfile.frontend`):

```bash
cd /path/to/repo
docker compose build --no-cache frontend
docker compose up -d frontend
```

3. Verify the runtime files are present in the nginx image:

```bash
docker exec <frontend-container> ls -la /usr/share/nginx/html
docker exec <frontend-container> sed -n '1,160p' /usr/share/nginx/html/index.html
curl -I http://localhost:8080/
curl -I http://localhost:8080/assets/main-*.js
```

If `index.html` points at `/assets/*.js` and those files are present, nginx should serve the SPA.

Common issues and fixes

- Permission errors from `npm ci` (EACCES):
  - Occurs when `node_modules` or nested `dist/` are owned by root on the host. Fix locally before building (or prefer Docker builds):
  ```bash
  sudo chown -R $(id -u):$(id -g) frontend/node_modules || true
  rm -rf frontend/dist frontend/frontend/dist || true
  ```

- Stale `index.html` (nginx welcome or SPA dev placeholder):
  - Often caused by copying the wrong `dist` or by a pre-existing `frontend/static/index.html` taking precedence.
  - Check `vite.config` ensures `root: 'frontend'` and `build.outDir: 'dist'` so `npm --prefix frontend run build` generates `frontend/dist`.
  - If multiple `dist/` locations exist (e.g., `frontend/frontend/dist`), remove the nested copy and rebuild.

- Docker build served default nginx page or placeholder
  - Inspect container filesystem to find which `index.html` was copied:
    ```bash
    docker run --rm -it ai_trader_frontend:latest sh -c "ls -la /usr/share/nginx/html && sed -n '1,120p' /usr/share/nginx/html/index.html"
    ```
  - If you see "Open SPA dev server at http://localhost:5173" then a static/dev template was copied instead of the built SPA. Fix by ensuring build produces `/app/dist/index.html` and assets.

- Heredoc / shell parsing errors while building Dockerfile
  - If your Docker build fails with "unterminated heredoc" or related errors, avoid complex here-doc constructs in `Dockerfile` RUN lines. Use simple echo/redirect or write a small script in the builder stage that generates `index.html` and run it via `RUN`.

- Forcing a clean Docker build when stale caches persist
  - Use `--no-cache` with `docker compose build`.

How the project's `Dockerfile.frontend` handles fallbacks

- The multi-stage `Dockerfile.frontend` does the following:
  1. Runs `npm --prefix frontend ci` inside a Node builder stage.
 2. Runs `npm --prefix frontend run build` (Vite) to create `dist` inside the builder (/app/dist or frontend/dist depending on config).
 3. Copies the built `dist` to a stable location `/app/dist` by searching known candidate paths (handles nested outputs).
 4. If no `index.html` exists but JS/CSS assets are present under `/app/dist/assets`, it generates a minimal `index.html` that references the first JS/CSS asset found.

This means: if your build produces assets but `index.html` is missing, the runtime will still be usable. However, for predictable deployments you should ensure Vite produces a proper `index.html` in the `dist/` directory.

Debugging tips (commands)

- Show container logs (nginx):
```bash
docker logs <frontend-container>
```

- Run a quick local Vite build (diagnose build errors outside Docker):
```bash
npm --prefix frontend ci
npm --prefix frontend run build
```

- Remove nested or prebuilt artifacts that confuse Docker COPY rules:
```bash
rm -rf frontend/frontend/dist
rm -rf frontend/dist
```

- Rebuild with no cache and inspect the image contents:
```bash
docker compose build --no-cache frontend
docker run --rm --entrypoint sh ai_trader_frontend:latest -c "ls -la /usr/share/nginx/html && ls -la /usr/share/nginx/html/assets"
```

## Monitor Components Status

**✅ Implemented Monitor Functionality:**
- SystemsMonitor: Grid layout of component health cards
- SignalsMonitor: Real-time trading signals table with details drawer
- ComponentCard: Enhanced with shadcn/ui, status indicators, restart functionality
- SignalDetailsDrawer: Modal with signal analysis and metadata
- Responsive design: Mobile-first with proper breakpoints (lg:grid-cols-12)
- Real-time WebSocket integration for live updates

**Fixed Issues:**
- API client "body stream already read" error resolved
- Responsive layout improved with proper grid breakpoints
- shadcn/ui integration for consistent design system

Headless smoke tests (optional)
- Use Playwright or Puppeteer to programmatically open `http://localhost:8080`, capture console logs and network requests. See `.github/FRONTEND_INSTRUCTIONS.md` for examples and recommended commands.

Contact & ownership
- If build problems persist, include the output of `docker compose build frontend`, `docker exec <frontend> sed -n '1,200p' /usr/share/nginx/html/index.html`, and `ls -la /usr/share/nginx/html/assets` when opening an issue.

## ⚠️ Aggressive cleanup note

If aggressive cleanup was performed on the developer host (for example: removing `frontend/node_modules`, `frontend/dist`, `.venv`, or running `docker system prune -af`), follow these steps to restore or rebuild the environment:

1. If quick restore is required and backups were saved under `/tmp` (timestamped):

   - Restore node modules (temporary):

     mv /tmp/node_modules_backup_<timestamp> frontend/node_modules

   - Restore frontend dist (temporary):

     mv /tmp/frontend_dist_backup_<timestamp> frontend/dist

   - Restore Python virtualenv (temporary):

     mv /tmp/venv_backup_<timestamp> .venv

2. Preferred rebuild workflow (recommended):

   - Reinstall node deps and build the frontend:

     npm --prefix frontend ci
     npm --prefix frontend run build

   - Recreate Python virtualenv and install deps:

     python3 -m venv .venv
     .venv/bin/pip install -r requirements.txt

   - Rebuild Rust extensions (if used):

     cd pattern_engine && cargo build

   - Rebuild Docker images and start services:

     docker compose build --no-cache
     docker compose up -d

3. If you run into missing model weights or runtime caches (TensorRT/ONNX), consult the per-service README files in `pattern_engine/`, `tensorrt_runner/`, or `models/` for download and restore steps.

Keep a backup of any `/tmp` restores if you need to preserve the previous state beyond the current boot session.
