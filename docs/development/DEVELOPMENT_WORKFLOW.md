# Development Workflow Guide

This guide helps you choose the right development approach for your current task.

## Decision Tree for Development Scripts

### What are you working on?

#### 🎨 **Frontend/UI Development Only**
- Need hot reload for React components?
- Working on styling, layout, or user interactions?
- Don't need backend API calls?

**→ Use `./hostexecs/quick-start.sh`**
- ✅ 0 seconds build time
- ✅ Instant hot reload
- ✅ Port 5173 (Vite dev server)
- ✅ Local development, no Docker

#### 🔧 **Frontend with Backend Integration**
- Need to test API calls?
- Working on WebSocket connections?
- Need realistic data from backend?

**→ Use `./hostexecs/dev-frontend.sh`**
- ✅ ~30s one-time build
- ✅ Instant file changes
- ✅ Port 8080 (Docker + hot reload)
- ✅ Includes backend services

#### 🚀 **Full Stack Development**
- Working on backend APIs?
- Need complete system integration?
- Testing end-to-end workflows?

**→ Use `./hostexecs/dev-fullstack.sh`**
- ✅ Complete development stack
- ✅ All services running
- ✅ Frontend: http://localhost:80
- ✅ Backend API: http://localhost:8000
- ✅ Full integration testing

#### 🏭 **Production Testing**
- Need to test production deployment?
- Performance testing?
- Final integration validation?

**→ Use `./hostexecs/production.sh`**
- ✅ All services in production mode
- ✅ Realistic deployment simulation
- ✅ Port 80 (production HTTP)

## Quick Reference

| Script | Use Case | Build Time | Ports | Environment |
|--------|----------|------------|-------|-------------|
| `quick-start.sh` | UI development | 0s | 5173 | Local |
| `dev-frontend.sh` | Frontend + API | ~30s | 8080 | Docker |
| `dev-fullstack.sh` | Full system | ~2-3min | 80/8000 | Docker |
| `production.sh` | Production test | ~2-3min | 80 | Docker |

## Common Scenarios

### Scenario 1: New React Component
1. Run `./scripts/quick-start.sh`
2. Develop component at http://localhost:5173
3. Test interactions locally
4. When ready for integration: switch to `./scripts/dev-frontend.sh`

### Scenario 2: API Integration
1. Start with `./scripts/dev-frontend.sh`
2. Test API calls at http://localhost:8080
3. Backend available at http://localhost:8000
4. Full WebSocket testing possible

### Scenario 3: End-to-End Testing
1. Use `./scripts/dev-fullstack.sh`
2. Test complete user workflows
3. Validate data flow between all services
4. Performance testing with realistic load

## Environment Variables

All scripts respect these environment variables:
- `DOCKER=true` - Forces Docker mode
- `NODE_ENV=development` - Enables dev features
- `DEBUG=true` - Enables debug logging

## Troubleshooting

### Port Conflicts
- Check what's running: `docker ps`
- Stop conflicting services: `docker stop <container>`
- Or use different ports in `.env`

### Build Failures
- Clear Docker cache: `docker system prune`
- Rebuild from scratch: `docker compose build --no-cache`

### Performance Issues
- For fastest iteration: use `quick-start.sh`
- For realistic testing: use Docker scripts
- Avoid `dev-fullstack.sh` for simple UI changes

## Advanced Usage

### Custom Development Stack
```bash
# Run only specific services
docker compose -f docker-compose.production.yml up postgres redis backend

# With custom environment
NODE_ENV=development DOCKER=true ./scripts/quick-start.sh
```

### Development with GPU
```bash
# For ML development with GPU acceleration
docker compose -f docker-compose.gpu.yml up
```

---

**Remember**: Start with the simplest script that meets your needs, then scale up as required.