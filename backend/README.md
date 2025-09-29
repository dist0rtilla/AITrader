# AITrader Backend Service

The backend service is the central orchestration layer for the AITrader system, providing RESTful APIs, WebSocket connections, and job management for the trading pipeline.

## 🏗️ Archit- Error tracking and alerting
- Performance metrics

**📋 Service Status**: See [PROJECT_STATUS.md](../docs/PROJECT_STATUS.md) for current backend implementation status.

## 📚 Additional Resourcesre Overview

The backend serves as a lightweight orchestration service that:
- Manages user-facing APIs and WebSocket connections
- Enqueues background jobs to Redis for processing
- Coordinates between Pattern Engine, Strategy Engine, and other services
- Provides real-time updates to the frontend dashboard

### Service Structure
```
backend/
├── api/           # FastAPI route definitions
├── core/          # Database models and configuration
├── services/      # Business logic and external service clients
├── settings/      # Environment configuration
├── main.py        # FastAPI application entry point
└── ws_broadcaster.py  # WebSocket message broadcasting
```

## 🚀 Quick Start

### Local Development (Recommended)
```bash
# From project root
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables (or copy .env.example to .env)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aitrader"
export REDIS_URL="redis://localhost:6379/0"
export MCP_URL="http://localhost:9000/mcp"

# Run the service
PYTHONPATH=.. uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Note: if port 8000 is already bound on your machine (for example by a system service
or another development instance), a convenient alternative port for quick tests is
8010. You can start the backend on the alternate port as follows:

```bash
# Start on alternate port 8010
PYTHONPATH=.. uvicorn main:app --reload --host 127.0.0.1 --port 8010
```

### Docker Development
```bash
# From project root
docker compose -f docker-compose.production.yml up backend
```

### Access Points
- **API**: http://localhost:8000
- **OpenAPI Docs**: http://localhost:8000/docs
- **WebSocket**: ws://localhost:8000/ws

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Health check and service status
- `GET /health` - Detailed health information
- `POST /jobs` - Create background jobs
- `GET /jobs/{job_id}` - Get job status and results

### MCP (Market Connectivity Protocol) Proxy
- `GET /mcp/login` - Authenticate with broker
- `GET /mcp/holdings` - Get account holdings
- `GET /mcp/positions` - Get current positions
- `POST /mcp/orders` - Place orders

### WebSocket Events
- `system_status` - Component health updates
- `trading_signals` - Real-time pattern signals
- `job_updates` - Background job status changes
- `market_data` - Live market data feeds

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aitrader

# Redis for job queue and caching
REDIS_URL=redis://localhost:6379/0

# External services
MCP_URL=http://mock-mcp:9000/mcp
ONNX_RUNNER_URL=http://onnx-runner:8001
SENTIMENT_ENGINE_URL=http://sentiment-engine:8002
STRATEGY_ENGINE_URL=http://strategy-engine:8082

# Service configuration
PORT=8000
DEBUG=true
LOG_LEVEL=INFO
```

### Dependencies
- **FastAPI**: Web framework and OpenAPI documentation
- **SQLAlchemy**: Database ORM and migrations
- **Redis**: Job queue and real-time messaging
- **WebSockets**: Real-time frontend communication
- **Pydantic**: Data validation and serialization

## 🔄 Job Management

The backend uses Redis for asynchronous job processing:

### Job Types
- `suggestion` - Generate trading suggestions using ML models
- `backtest` - Run historical strategy backtests
- `pattern_scan` - Scan market data for patterns
- `sentiment_analysis` - Analyze news sentiment

### Job Lifecycle
1. **Enqueue**: API endpoint creates job in Redis queue
2. **Process**: Worker service picks up and processes job
3. **Update**: Job status and results stored in database
4. **Notify**: WebSocket broadcasts job completion

### Example Job Creation
```python
from backend.services.job_runner import enqueue_job

# Enqueue a suggestion job
job_id = enqueue_job(
    job_type='suggestion',
    user_id='user123',
    payload={'symbols': ['AAPL', 'GOOGL'], 'timeframe': '1d'}
)
```

## 🗄️ Database Schema

### Core Tables
- `jobs` - Background job queue and results
- `users` - User accounts and authentication
- `user_tokens` - API authentication tokens
- `backtest_results` - Historical backtest data
- `orders` - Order history and execution records
- `fills` - Trade execution details

### Migration Management
```bash
# Apply migrations
docker compose run --rm backend alembic upgrade head

# Create new migration
docker compose run --rm backend alembic revision --autogenerate -m "Description"
```

## 🧪 Testing & Development

### Running Tests
```bash
# Unit tests
PYTHONPATH=. pytest tests/

# API integration tests
PYTHONPATH=. pytest tests/test_api.py

# Database tests
PYTHONPATH=. pytest tests/test_db.py
```

### Development Workflow
1. **Make changes** to backend code
2. **Test locally** with `uvicorn --reload`
3. **Run tests** to ensure no regressions
4. **Update database** schema if needed
5. **Test with full stack** using docker-compose

### Debugging
```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=DEBUG

# Run with debugger
python -m pdb -c continue main.py
```

## 🔗 Service Integration

### Pattern Engine Integration
- Subscribes to Redis streams for pattern signals
- Forwards signals to Strategy Engine
- Maintains signal history for analysis

### Strategy Engine Integration
- Sends pattern signals and market context
- Receives trading decisions and risk metrics
- Tracks strategy performance

### Frontend Integration
- Provides REST APIs for dashboard data
- Broadcasts real-time updates via WebSocket
- Serves static assets and SPA routing

## 📊 Monitoring & Health Checks

### Health Endpoints
- `GET /health` - Service health status
- `GET /health/db` - Database connectivity
- `GET /health/redis` - Redis connectivity
- `GET /health/services` - External service status

### Metrics
- Request/response times
- Job processing rates
- Database connection pool status
- WebSocket connection counts

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking and alerting
- Performance metrics

##  Additional Resources

- [API Documentation](../docs/api/API_DOCUMENTATION.md)
- [Architecture Overview](../docs/architecture/BACKEND_ARCH.md)
- [Service Interfaces](../docs/architecture/BACKEND_INTERFACES.md)
- [Development Guide](../docs/development/DEVELOPMENT.md)