# Backend Architecture Documentation

**AITrader Backend System Architecture & Implementation Guide**

This document provides a comprehensive overview of the AITrader backend architecture, including all services, components, data flows, and deployment considerations. It serves as the authoritative reference for backend development and system understanding.

---

## Executive Summary

AITrader implements a dual-path microservices architecture optimized for both AI-driven day trading strategies and high-frequency pattern detection. The system separates compute-intensive ML inference (CPU/GPU) from business logic while maintaining real-time data streaming capabilities through Redis.

**Key Principles:**
1. **GPU-First ML**: TensorRT (GPU) for performance, ONNX Runner (CPU) for reliability.
2. **Event-Driven**: Redis Streams for service communication
3. **Container-Native**: All services Dockerized with health checks
4. **Mock-Friendly**: Offline development with mock services
5. **ML-Enhanced Decisions**: Multi-factor analysis combining technical indicators, ML predictions, and sentiment analysis

---

## System Architecture Tree

```
AITrader Backend System
├── 🔄 Message Bus & Storage
│   ├── Redis (6379) ✅ - Streams, pub/sub, caching
│   └── PostgreSQL (5432) ✅ - Persistent storage, audit logs
│
├── 🎯 Core Trading Services
│   ├── Pattern Engine (internal) ⚡ - Signal detection (hot path)
│   │   ├── Pattern Detector ✅ - pattern_engine/pattern_detector.py
│   │   ├── Native Runner (Rust/C++) 📋 - Ultra-low latency processing
│   │   ├── Python Bridge 🔧 - pattern_engine/runner.py
│   │   └── TRT Engine Interface 🔧 - GPU-accelerated inference
│   │
│   ├── Strategy Engine (8005) ✅ - Decision making (warm path)
│   │   ├── Enhanced ML Strategy ✅ - strategy_engine/enhanced_strategy_service.py
│   │   ├── ML Client Integration ✅ - strategy_engine/ml_client.py
│   │   ├── LangChain/Haystack RAG 🔧 - LLM strategy generation
│   │   ├── Risk Calculator ✅ - Position sizing, risk mgmt
│   │   └── MCP Integration ✅ - Account context via mock-mcp
│   │
│   └── Execution Engine (8006) 🚧 - Order management (critical path)
│       ├── Order Management System 📋 - Trade lifecycle
│       ├── Risk Controls 📋 - Pre/post-trade checks
│       ├── Execution Simulator ✅ - Development trading
│       └── Broker Integration 📋 - Real broker connectivity
│
├── 🧠 ML & Analytics Services
│   ├── ONNX Runner (8001) 🔧 - CPU-optimized model serving
│   │   ├── N-BEATS Forecasting ✅ - Time series predictions
│   │   ├── CNN Pattern Detection 🔧 - Pattern classification
│   │   ├── Model Management 📋 - Version control, A/B testing
│   │   └── Health Monitoring ✅ - Model performance tracking
│   │
│   ├── TensorRT Runner (8007) 📋 - GPU-accelerated inference
│   │   ├── TensorRT Engine Builder 🔧 - ONNX → TRT conversion
│   │   ├── GPU Memory Management 📋 - Efficient VRAM usage
│   │   ├── Batch Processing 📋 - High-throughput inference
│   │   └── Fallback to ONNX 🔧 - Graceful degradation
│   │
│   ├── Sentiment Engine (8002) 🔧 - NLP sentiment analysis
│   │   ├── FastAPI Service (sentiment_engine/app.py)
│   │   ├── Multi-source Analysis 🔧 - News, social media
│   │   ├── Authenticity Scoring 🔧 - Fake news detection
│   │   └── Aggregation Engine 📋 - Symbol-level sentiment
│   │
│   └── FinBERT Server (8004) ✅ - Financial sentiment analysis
│       ├── Flask Service (finbert_server/app.py)
│       ├── Pre-trained FinBERT Model ✅ - yiyanghkust/finbert-tone
│       └── Text Classification ✅ - Financial text sentiment
│
├── 📊 Data & Market Services
│   ├── Market Data Pipeline 🔧
│   │   ├── Tick Replay (tick_replay) ✅ - Historical data simulation
│   │   ├── Book Builder (book_builder) 🔧 - Order book reconstruction
│   │   ├── Data Normalizer 📋 - Multi-source data harmonization
│   │   └── Feed Handler 📋 - Real-time market data ingestion
│   │
│   └── Data Storage & Management
│       ├── Time Series Storage 📋 - High-frequency tick data
│       ├── Model Artifacts 🔧 - ONNX/TRT model storage (./models/)
│       ├── Training Data 📋 - ML dataset management
│       └── Audit Logs ✅ - PostgreSQL persistent storage
│
├── 🌐 API & Integration Layer
│   ├── Main Backend (8000) 🔧 - Primary FastAPI service
│   │   ├── API Gateway 🔧 - Request routing, rate limiting
│   │   ├── WebSocket Hub ✅ - Real-time client connections
│   │   ├── Authentication 📋 - JWT, role-based access
│   │   └── Health Aggregator 📋 - System-wide health monitoring
│   │
│   ├── Worker Service (background) 🔧 - Async job processing
│   │   ├── Job Queue Consumer ✅ - Redis-based task processing
│   │   ├── Training Orchestrator 📋 - ML pipeline management
│   │   ├── Data Processing 📋 - ETL operations
│   │   └── Scheduled Tasks 📋 - Maintenance, cleanup
│   │
│   └── Mock Services (Development)
│       ├── Mock MCP Server (9000) ✅ - Zerodha API simulation
│       └── Mock Data Feeds 📋 - Test market data generation
│
└── 🎨 Frontend Integration
    ├── Static Frontend (8080) ✅ - React SPA via Nginx
    ├── API Client Libraries ✅ - TypeScript clients
    └── WebSocket Integration ✅ - Real-time UI updates
```

**Legend:**
- ✅ **Implemented** - Fully functional
- 🔧 **In Progress** - Basic implementation exists
- 📋 **Planned** - Designed but not implemented
- 🚧 **Stub/Mock** - Development placeholder
- ⚡ **Hot Path** - Ultra-low latency requirement
- 📊 **Data Service** - High-throughput data processing

---

## Service Specifications & Implementation Status

### Core Infrastructure Services

#### PostgreSQL Database (Port 5432)
**Status**: ✅ **Fully Operational**
- **Purpose**: Persistent storage for trades, jobs, user data, audit logs
- **Schema**: SQLAlchemy models with Alembic migrations
- **Features**: 
  - Connection pooling via SQLAlchemy
  - Automated backup capabilities (planned)
  - Read replicas for analytics (planned)
- **Docker Image**: `postgres:15-alpine`
- **Environment**: Production-ready with persistent volumes

#### Redis Cache & Streams (Port 6379)
**Status**: ✅ **Fully Operational**
- **Purpose**: Message bus, caching, job queues, real-time data streams
- **Features**:
  - Redis Streams for event-driven architecture
  - Pub/Sub for real-time notifications
  - TTL-based caching for market data
  - Job queue via Redis queues
- **Stream Channels**:
  - `signals:global` - Pattern engine signals
  - `signals:{symbol}` - Symbol-specific signals
  - `orders:gateway` - Order execution events
  - `fills:global` - Trade fill notifications
  - `audit:raw_ticks` - Raw tick data for audit
- **Docker Image**: `redis:7`

### Primary Backend Services

#### Main Backend API (Port 8000)
**Status**: 🔧 **In Progress**  
**Service Directory**: `backend/`  
**Technology**: FastAPI + Python 3.10+

**Features**:
- ✅ WebSocket support for real-time monitoring (`/api/ws/monitor`)
- 🔧 CORS middleware for development
- 📋 Authentication & authorization system
- 📋 Request rate limiting
- 📋 API versioning support

**Key Endpoints**:
- `GET /api/status` - System health aggregation
- `WS /api/ws/monitor` - Real-time event stream
- `GET /api/signals` - Trading signals API
- `POST /api/executions` - Order submission

**Dependencies**: postgres, redis, mock-mcp

#### Worker Service (Background Processing)
**Status**: 🔧 **In Progress**  
**Service Directory**: `backend/workers/`  
**Technology**: Python asyncio with Redis queues

**Features**:
- ✅ Redis queue consumption
- 🔧 Job processing (suggestions, backtests)
- 📋 Training job orchestration
- 📋 Scheduled maintenance tasks
- 📋 Error handling and retry logic

**Job Types**:
- `suggestion` - LLM-based trading suggestions
- `backtest` - Strategy backtesting
- `training` - ML model training
- `maintenance` - System cleanup

### Trading & Strategy Services

#### Strategy Engine (Internal Port)
**Status**: 🔧 **In Progress**  
**Service Directory**: `strategy_engine/`  
**Technology**: FastAPI + SQLAlchemy + LangChain

**Core Components**:
- ✅ Signal processing pipeline
- 🔧 Risk calculator (`calculator.py`)
- 🔧 Technical indicators (`indicators.py`)
- 🔧 LangChain/Haystack integration (`langchain_haystack.py`)
- 🔧 Database models (`models.py`, `db.py`)

**Features**:
- Signal aggregation and filtering
- Position sizing calculations
- Risk management rules
- LLM strategy generation
- MCP account integration
- Performance analytics

**Dependencies**: redis, mock-mcp, database

#### Pattern Engine (Hot Path Processing)
**Status**: 🔧 **In Progress**  
**Service Directory**: `pattern_engine/`  
**Technology**: Python bridge + Native core (planned)

**Components**:
- 🔧 Python runner (`runner.py`) - Development implementation
- 🔧 State management (`state.py`) - EMA, VWAP, Welford statistics
- 🔧 TensorRT integration (`trt_engine.py`)
- 📋 Native core (`native/`) - Rust/C++ implementation planned
- ✅ ONNX model loading (`onnx_runner.py`)

**Performance Requirements**:
- < 1ms signal detection latency (native target)
- Memory-efficient streaming processing
- Stateful per-symbol calculations
- Pattern detection and scoring

#### Execution Simulator (Port 8006)
**Status**: 🚧 **Stub Implementation**  
**Service Directory**: `execution_gateway/` (planned)  
**Technology**: FastAPI + Order Management

**Features**:
- 🚧 Order lifecycle simulation
- 📋 Pre-trade risk checks
- 📋 Position tracking
- 📋 Fill simulation with realistic latency
- 📋 Broker integration framework

### ML & Analytics Services

#### ONNX Runner (Port 8001) - CPU Optimized
**Status**: 🔧 **In Progress**  
**Technology**: FastAPI + ONNXRuntime (CPU)  
**Dockerfile**: `Dockerfile.onnx_runner`

**Models Supported**:
- ✅ N-BEATS time series forecasting
- 🔧 CNN pattern classification
- 📋 Transformer-based models
- 📋 Custom ensemble models

**Features**:
- ✅ Health checks and model status
- 🔧 Batch inference support
- 📋 Model versioning and A/B testing
- 📋 Performance monitoring
- ✅ Graceful fallback handling

**Critical Design Decision**: 
> **CPU-First Approach**: ONNX Runner uses CPU by default for reliability and consistent latency. GPU acceleration is provided separately via TensorRT Runner for optional performance gains without creating GPU dependencies in the critical path.

**Environment Variables**:
- `ONNX_MODEL_PATH=/models/toy_cnn.onnx`
- `ONNX_RUNNER_HOST=0.0.0.0`
- `ONNX_RUNNER_PORT=8001`

#### TensorRT Runner (Port 8007) - GPU Acceleration
**Status**: 📋 **Planned**  
**Service Directory**: `tensorrt_runner/`  
**Technology**: FastAPI + TensorRT + PyCUDA

**Purpose**: 
> **Parallel GPU Path**: TensorRT Runner provides GPU-accelerated inference as a performance enhancement parallel to the ONNX Runner. Strategy Engine can query both services and use the faster response, ensuring GPU issues don't block trading operations.

**Features**:
- 📋 ONNX → TensorRT engine compilation
- 📋 GPU memory management
- 📋 Batch processing optimization
- 📋 Automatic fallback to ONNX Runner
- 📋 Performance benchmarking

**GPU Requirements**:
- NVIDIA GPU with CUDA 11.8+
- TensorRT 8.x runtime
- Docker with NVIDIA Container Toolkit

#### Sentiment Engine (Port 8002)
**Status**: 🔧 **In Progress**  
**Service Directory**: `sentiment_engine/`  
**Technology**: FastAPI + Transformers

**Features**:
- 🔧 Multi-source sentiment analysis
- 🔧 Authenticity scoring for news
- 📋 Symbol-level sentiment aggregation
- 📋 Real-time sentiment streaming
- 🔧 Integration with FinBERT service

**Data Sources**:
- News articles (RSS, APIs)
- Social media (Twitter, Reddit)
- Financial reports and filings
- Analyst reports

#### FinBERT Server (Port 8004)
**Status**: ✅ **Fully Implemented**  
**Service Directory**: `finbert_server/`  
**Technology**: Flask + Transformers + HuggingFace

**Model**: `yiyanghkust/finbert-tone`  
**Features**:
- ✅ Financial text sentiment classification
- ✅ Health check endpoint (`/health`)
- ✅ Prediction endpoint (`/predict`)
- ✅ Error handling for model failures

### Data Pipeline Services

#### Market Data Services
**Status**: 🔧 **In Progress**

**Tick Replay Service**:
- ✅ Historical data simulation (`market_data/tick_replay.py`)
- 🔧 Configurable replay speed
- 📋 Multi-symbol support
- 📋 Real-time feed integration

**Book Builder Service**:
- 🔧 Order book reconstruction (`market_data/book_builder.py`)
- 📋 Level-2 data processing
- 📋 NBBO calculation
- 📋 Book imbalance detection

---

## Docker Network Architecture

### Port Allocation Strategy

```
Port Range 5000-5999: Infrastructure Services
├── 5432: PostgreSQL Database
└── 6379: Redis Cache & Streams

Port Range 8000-8099: Application Services  
├── 8000: Main Backend API (FastAPI)
├── 8001: ONNX Runner (CPU Inference)
├── 8002: Sentiment Engine (NLP Analysis)
├── 8003: Backend-Main (Alternative Instance)
├── 8004: FinBERT Server (Financial Sentiment)
├── 8005: Strategy Engine (Trading Logic) [Internal]
├── 8006: Execution Engine (Order Management) [Internal]  
├── 8007: TensorRT Runner (GPU Inference) [Planned]
└── 8080: Frontend (Nginx Static)

Port Range 9000-9999: Mock & Development Services
└── 9000: Mock MCP Server (Zerodha Simulation)
```

### Docker Compose Network Configuration

**Default Network**: `aitrader_default` (bridge mode)  
**Service Discovery**: Container names resolve via Docker DNS  
**External Access**: Only specified ports are exposed to host

**Internal Service Communication**:
```yaml
# Services communicate via container names
backend -> postgres:5432
backend -> redis:6379  
backend -> mock-mcp:9000
strategy_engine -> onnx_runner:8001
strategy_engine -> sentiment_engine:8002
```

**Host Port Mapping** (Development):
```yaml
Host:Container Port Mapping
5432:5432   # postgres (direct DB access)
6379:6379   # redis (redis-cli access)
8000:8000   # backend (API access)
8001:8001   # onnx_runner (model inference)
8080:80     # frontend (web interface)
9000:9000   # mock-mcp (mock API)
```

### Production Network Considerations

**Security**:
- Remove host port mappings for internal services
- Use Docker secrets for sensitive configuration
- Implement network policies for service isolation
- Add reverse proxy (nginx/traefik) for TLS termination

**Scalability**:
- Use Docker Swarm or Kubernetes for orchestration
- Implement service mesh for advanced networking
- Add load balancers for high-availability services
- Configure external databases and cache clusters

---

## Persistent Storage Architecture

### PostgreSQL Schema Design

**Database**: `aitrader`  
**Migration System**: Alembic  
**ORM**: SQLAlchemy

**Core Tables**:

```sql
-- Job Management
jobs (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'suggestion', 'backtest', 'training'
  status VARCHAR(20) NOT NULL, -- 'queued', 'running', 'completed', 'failed'
  payload JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

-- User Management
users (
  id UUID PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'trader',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trading Records
trades (
  trade_id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL, -- 'BUY'/'SELL'
  qty DECIMAL(18,8) NOT NULL,
  price DECIMAL(18,8) NOT NULL,
  fees DECIMAL(18,8) DEFAULT 0,
  pnl DECIMAL(18,8) DEFAULT 0,
  strategy_tag VARCHAR(100),
  notes TEXT
);

-- Strategy Performance
backtests (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  metrics JSONB, -- Sharpe, max drawdown, etc.
  timeseries_path VARCHAR(255), -- Path to detailed results
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Trail
audit_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id),
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  changes JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

**Indexing Strategy**:
- Primary keys (UUID v4 for distributed systems)
- Time-based queries (timestamp columns)
- Symbol lookups (trading data)
- Job status queries (operational monitoring)

### Redis Data Structures

**Stream Architecture**:
```redis
# Signal Distribution
XADD signals:global * id <uuid> symbol AAPL score 0.75 timestamp <iso>
XADD signals:AAPL * id <uuid> score 0.75 pattern "breakout" meta "{...}"

# Order Flow
XADD orders:gateway * id <uuid> symbol AAPL side BUY qty 100 price 150.00
XADD fills:global * order_id <uuid> fill_qty 100 fill_price 150.05

# Audit Stream
XADD audit:raw_ticks * symbol AAPL price 150.05 volume 1000 timestamp <iso>
```

**Consumer Groups**:
- `strategy_consumers` - Strategy engine signal processing
- `audit_consumers` - Compliance and audit logging
- `analytics_consumers` - Real-time analytics processing

**Caching Strategy**:
```redis
# Market Data Cache (TTL: 60s)
SET market:AAPL:price "150.05" EX 60
SET market:AAPL:volume "1000000" EX 60

# Model Results Cache (TTL: 300s)  
SET prediction:AAPL:nbeats "{"forecast": [151.0, 151.5, 152.0]}" EX 300

# User Session Cache (TTL: 3600s)
SET session:<token> "{"user_id": "...", "role": "trader"}" EX 3600
```

---

## Critical Design Guidelines

### ONNX vs TensorRT Strategy

**Problem**: GPU dependencies can cause system instability and deployment complexity.

**Solution**: Dual-path inference architecture:

1. **Primary Path (ONNX CPU)**:
   - Reliable, consistent latency
   - No GPU driver dependencies  
   - Production-stable inference
   - Fallback for all scenarios

2. **Performance Path (TensorRT GPU)**:
   - Optional GPU acceleration
   - Parallel processing to ONNX
   - Strategy Engine uses fastest response
   - Graceful degradation on GPU failures

**Implementation Pattern**:
```python
# Strategy Engine inference logic
async def get_prediction(symbol: str, data: list):
    # Start both requests in parallel
    onnx_task = asyncio.create_task(onnx_client.predict(symbol, data))
    trt_task = asyncio.create_task(trt_client.predict(symbol, data))
    
    # Use the first successful response
    done, pending = await asyncio.wait(
        [onnx_task, trt_task], 
        return_when=asyncio.FIRST_COMPLETED
    )
    
    # Cancel remaining tasks
    for task in pending:
        task.cancel()
    
    return done.pop().result()
```

### Performance & Scalability Guidelines

**Hot Path Optimization**:
- Pattern Engine: Target < 1ms per signal detection
- Memory pools for zero-allocation processing
- Stateful processing with minimal garbage collection
- Lockless data structures for multi-threaded processing

**Warm Path Flexibility**:
- Strategy Engine: Target < 100ms for decision making
- Allow for complex LLM and database queries
- Implement circuit breakers for external dependencies
- Use async processing for non-critical operations

**Data Flow Optimization**:
- Redis Streams for decoupled, resilient messaging
- Batch processing where appropriate (ML inference)
- Connection pooling for database and external APIs
- Compression for large data transfers

### Operational Guidelines

**Health Monitoring**:
- All services must implement `/health` and `/ready` endpoints
- Structured logging with correlation IDs
- Metrics export for Prometheus monitoring
- Alert thresholds for critical performance metrics

**Deployment Safety**:
- Blue-green deployments for zero-downtime updates
- Database migrations must be backwards compatible
- Feature flags for experimental functionality
- Automated rollback procedures

**Development Workflow**:
- Mock services for offline development
- Docker Compose for local full-stack development
- Automated testing at service and integration levels
- CI/CD pipelines with quality gates

---

## Implementation Roadmap

### Phase 1: Core Foundation (Current Sprint)
**Priority**: Complete basic service infrastructure

- ✅ Docker Compose orchestration
- 🔧 Main Backend API completion (`/api/status`, `/api/signals`)
- 🔧 WebSocket real-time system
- 📋 Strategy Engine signal processing
- 📋 ONNX Runner model serving

**Success Criteria**: End-to-end signal generation and display in frontend

### Phase 2: Trading Pipeline (Next Sprint)
**Priority**: Complete trading workflow

- Strategy Engine decision making
- Execution Engine order management
- Pattern Engine native implementation
- TensorRT Runner parallel processing
- Performance optimization

**Success Criteria**: Live trading simulation with real-time P&L

### Phase 3: Production Readiness (Future Sprint)
**Priority**: Operational excellence

- Authentication and authorization
- Comprehensive monitoring and alerting
- Performance optimization and scaling
- Security hardening
- Production deployment automation

**Success Criteria**: Production-ready deployment with SLA monitoring

---

## Troubleshooting & Common Pitfalls

### GPU/CUDA Issues
**Problem**: TensorRT failures blocking trading operations  
**Solution**: Use dual-path inference with CPU fallback  
**Prevention**: Implement health checks and automatic failover

### Memory Leaks in ML Services
**Problem**: Long-running inference services consuming excessive memory  
**Solution**: Implement periodic service restarts and memory monitoring  
**Prevention**: Use memory profiling in CI/CD pipeline

### Redis Stream Lag
**Problem**: High message volume causing consumer lag  
**Solution**: Implement consumer scaling and message TTL  
**Prevention**: Monitor stream length and processing time

### Database Connection Exhaustion
**Problem**: High connection count causing database lockups  
**Solution**: Implement connection pooling and connection limits  
**Prevention**: Monitor connection usage and implement circuit breakers

---

*Document Version: 1.0*  
*Last Updated: September 27, 2025*  
*Next Review: October 27, 2025*

---

**Related Documentation**:
- [Frontend Instructions](../frontend/FRONTEND_INSTRUCTIONS.md)
- [Backend Interfaces](BACKEND_INTERFACES.md)
- [Build Instructions](../development/BUILD_INSTRUCTIONS.md)
- [Copilot Instructions](../instructions/copilot-instructions.md)