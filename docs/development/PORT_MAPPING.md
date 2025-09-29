# Port Mapping Strategy - Authoritative Guide

## ⚠️ **IMPORTANT**: This is the definitive source for all port assignments

All documentation, scripts, and configurations must use the ports defined below. No exceptions.

## Development Environments

### Local Development (Fastest Iteration)
- **Port 5173**: Vite dev server
  - Script: `./hostexecs/quick-start.sh`
  - Purpose: UI-only development with instant hot reload
  - No Docker, no backend services

### Docker Frontend Development
- **Port 8080**: Frontend with hot reload
  - Script: `./hostexecs/dev-frontend.sh`
  - Configuration: `docker compose.frontend-only.yml`
  - Purpose: Frontend development with backend API access
  - Container: `trading-ai-frontend-dev`

### Full Stack Development
- **Port 80**: Frontend (nginx)
  - Script: `./hostexecs/dev-fullstack.sh`
  - Configuration: `docker compose.production.yml`
  - Purpose: Complete development stack
- **Port 8000**: Backend API
  - Included in full stack development

### Production Deployment
- **Port 80**: Frontend (nginx)
  - Script: `./hostexecs/production.sh`
  - Configuration: `docker compose.production.yml`
  - Purpose: Production testing and deployment
- **Port 443**: HTTPS (when SSL configured)

## Backend Services (Fixed Ports)

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Backend API | 8000 | HTTP | Main FastAPI application |
| ONNX Runner | 8001 | HTTP | ML model inference |
| Sentiment Engine | 8002 | HTTP | Sentiment analysis |
| Strategy Engine | 8005 | HTTP | Trading strategies |
| Execution Engine | 8006 | HTTP | Order execution |
| TensorRT Runner | 8007 | HTTP | GPU-accelerated inference |
| PostgreSQL | 5432 | TCP | Database |
| Redis | 6379 | TCP | Cache and queues |
| Mock MCP | 9000 | HTTP | Broker simulation |
| FinBERT Server | 5000 | HTTP | Sentiment model |

## Environment Variable Configuration

```bash
# Frontend
FRONTEND_PORT=8080

# Backend Services
BACKEND_PORT=8000
ONNX_RUNNER_PORT=8001
SENTIMENT_ENGINE_PORT=8002
STRATEGY_ENGINE_PORT=8005
EXECUTION_ENGINE_PORT=8006
TENSORRT_RUNNER_PORT=8007

# Infrastructure
POSTGRES_PORT=5432
REDIS_PORT=6379
MCP_PORT=9000
FINBERT_PORT=5000
```

## Port Validation

### Automated Validation Script
Run this to check for port conflicts:

```bash
#!/bin/bash
# scripts/validate_ports.sh

echo "🔍 Checking port availability..."

PORTS=(5173 8080 80 8000 8001 8002 8005 8006 8007 5432 6379 9000 5000)

for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        echo "❌ Port $port is in use"
        lsof -Pi :$port -sTCP:LISTEN
    else
        echo "✅ Port $port is available"
    fi
done
```

### Manual Port Checking
```bash
# Check specific port
lsof -i :8080

# Check all listening ports
netstat -tlnp | grep LISTEN

# Docker containers using ports
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## Port Conflict Resolution

### Stop Conflicting Services
```bash
# Stop all development containers
docker compose -f docker compose.frontend-only.yml down
docker compose -f docker compose.production.yml down

# Stop specific service
docker stop trading-ai-frontend-dev

# Kill process using port
sudo lsof -ti:8080 | xargs kill -9
```

### Change Default Ports
If you must use different ports, set environment variables:

```bash
# Use different frontend port
export FRONTEND_PORT=3000
./hostexecs/dev-frontend.sh

# Use different backend port
export BACKEND_PORT=3001
docker compose -f docker compose.production.yml up backend
```

## Development Workflow by Port

| Port | Environment | Use Case | Startup Time | Hot Reload |
|------|-------------|----------|--------------|------------|
| 5173 | Local | UI-only development | Instant | ✅ |
| 8080 | Docker | Frontend + API integration | ~30s | ✅ |
| 8080 | Full Stack | Complete system development | ~2-3min | ✅ |
| 80 | Production | Complete system production | ~2-3min | ✅ |
| 8000 | Backend | API development | ~1min | ✅ |

## Production Considerations

- **Port 80/443**: Standard web ports, no configuration needed
- **SSL Termination**: Handle at load balancer or nginx level
- **Internal Services**: Use internal networking, expose only port 80 externally
- **Health Checks**: All services expose `/health` endpoints on their assigned ports

---

**📋 Last Updated**: September 29, 2025
**📝 Update Process**: When adding new services, update this file first, then update all configurations.