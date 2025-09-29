# 🚀 AITrader Development Guide

This guide provides multiple development approaches optimized for different scenarios, from instant local development to complete production stack testing.

## 🎯 **Choose Your Development Approach**

### 🚀 **Quick Start - Local Development** (Fastest iteration)
**Build time: ~5 seconds** ⚡ **Hot reload: Instant** ⚡ **No Docker required**

```bash
./hostexecs/quick-start.sh
```

- **Port**: http://localhost:5173
- **Requirements**: Node.js 18+, npm
- **Best for**: UI/UX work, rapid prototyping, component development
- **Pros**: Fastest possible development cycle, familiar Vite workflow
- **Cons**: Frontend-only, no backend integration

### 🐳 **Frontend Development - Docker** (Consistent environment)
**Build time: ~30 seconds (one-time)** ⚡ **Hot reload: Near-instant**

```bash
./hostexecs/dev-frontend.sh
```

- **Port**: http://localhost:8080
- **Requirements**: Docker, Docker Compose
- **Best for**: Frontend development with consistent environment
- **Pros**: Matches production environment, Docker consistency
- **Cons**: Slightly slower than local development

### 🏗️ **Full Stack Development** (Complete system)
**Build time: ~60 seconds** ⚡ **Hot reload: Frontend only**

```bash
./hostexecs/dev-fullstack.sh
```

- **Ports**: Frontend http://localhost:8080, API http://localhost:8000
- **Requirements**: Docker, Docker Compose
- **Best for**: Backend integration, API development, database work
- **Pros**: Complete development environment, all services available
- **Cons**: Longer startup time, more resource intensive

### 🚀 **Production Testing** (Complete deployment simulation)
**Build time: ~90 seconds** ⚡ **No hot reload**

```bash
./hostexecs/production.sh
```

- **Ports**: Frontend http://localhost:80, API http://localhost:8000
- **Requirements**: Docker, Docker Compose
- **Best for**: Production testing, integration testing, demo preparation
- **Pros**: Complete production simulation, all ML services included
- **Cons**: Longest startup, production builds

## � **REQUIRED: Changelog Maintenance**

**⚠️ ALWAYS update the changelog before making changes:**

```bash
# 1. Edit changelog first
vim docs/CHANGELOG.md

# 2. Add entry under [Unreleased] with current date
## [2025-09-28] - Your change description

# 3. Make your changes
# 4. Commit both changelog and changes together
```

**Changelog required for:**
- New features, bug fixes, configuration changes
- Documentation updates, build modifications  
- Any user-facing changes
- Before creating pull requests

**Format:** `[YYYY-MM-DD] - Brief Description`  
**Guidelines:** See [docs/CHANGELOG.md](../CHANGELOG.md)

---

## �🛠 What We Optimized

### Docker Build Optimizations
- ✅ **Layer Caching**: Package.json copied separately from source code
- ✅ **Build Cache Mounts**: npm and Vite caches preserved between builds
- ✅ **Reduced Context**: Enhanced .dockerignore excludes unnecessary files
- ✅ **Multi-stage Builds**: Optimized for both development and production

### Development Workflows
- ✅ **Hot Reload**: Instant file change reflection
- ✅ **Volume Mounts**: No rebuilds needed for code changes
- ✅ **Environment Variables**: Proper polling for file watching

## 📊 Performance Comparison

| Method | Initial Setup | File Changes | Use Case |
|--------|---------------|--------------|----------|
| Local Dev | ~5 sec (npm install) | **Instant** | Active development |
| Docker Dev | ~30 sec (one-time build) | **Instant** | Consistent environment |
| Production Build | ~70 sec (first build) | ~30 sec rebuild | Testing/deployment |

## 🎯 **Development Workflow Recommendations**

### 🎨 **UI/UX Development**
```bash
./hostexecs/quick-start.sh     # Port 5173 - Fastest iteration
```
**Perfect for**: Component styling, layout work, theme development, rapid prototyping

### 🔧 **Frontend Feature Development**
```bash
./hostexecs/dev-frontend.sh    # Port 8080 - Docker consistency
```
**Perfect for**: New features, integration testing, consistent environment

### 🏗️ **Backend Integration Work**
```bash
./hostexecs/dev-fullstack.sh  # Ports 8080/8000 - Complete stack
```
**Perfect for**: API integration, WebSocket development, database interactions

### 🚀 **Pre-deployment Testing**
```bash
./hostexecs/production.sh     # Port 80 - Production simulation
```
**Perfect for**: Final testing, demo preparation, integration validation

## 📊 **Performance Comparison**

| Approach | Startup Time | Hot Reload | Resource Usage | Use Case |
|----------|--------------|------------|----------------|----------|
| **Quick Start** | ~5 seconds | Instant | Low | UI development |
| **Frontend Docker** | ~30 seconds | Near-instant | Medium | Feature development |
| **Full Stack** | ~60 seconds | Frontend only | High | Backend integration |
| **Production** | ~90 seconds | None | Highest | Testing/demos |

## 🔧 Manual Commands

### Environment Setup:
```bash
# Copy environment template
cp .env.example .env

# Validate environment configuration
python3 hostexecs/check_env.py
```

### Quick Local Development:
```bash
cd frontend
npm install  # First time only
npm run dev
```

### Docker Development:
```bash
### Docker Development:
```bash
docker compose -f docker compose.frontend-only.yml up
```
```

### Optimized Production Build:
```bash
export DOCKER_BUILDKIT=1
docker build -f frontend/Dockerfile.standalone -t trading-ai-frontend-standalone .
docker run -d --name trading-ai-frontend-standalone -p 8080:80 trading-ai-frontend-standalone
```

## 📝 Notes

- **First builds** may take longer due to dependency installation
- **Subsequent builds** are much faster due to caching
- **Hot reload** only works in development modes (options 1 & 2)
- **Production builds** create optimized, minified assets

Choose the method that best fits your current development needs! 🎉