# Backend Development Instructions

**Comprehensive Development Guide for AITrader Backend Services**

This document provides actionable development instructions for implementing, maintaining, and extending the AITrader backend system. It synthesizes the architecture specifications and interface definitions into practical development guidance.

---

## Quick Reference

**Core Files:**
- [Backend Architecture](../architecture/BACKEND_ARCH.md) - System design and component overview
- [Backend Interfaces](../architecture/BACKEND_INTERFACES.md) - API specifications and contracts
- [Copilot Instructions](../instructions/copilot-instructions.md) - AI development guidelines
- [Frontend Instructions](../frontend/FRONTEND_INSTRUCTIONS.md) - Frontend integration requirements

**Key Principles:**
1. **GPU-First ML**: TensorRT (GPU) for performance, ONNX Runner (CPU) for reliability.
2. **Event-Driven**: Redis Streams for service communication
3. **Container-Native**: All services Dockerized with health checks
4. **Mock-Friendly**: Offline development with mock services

---

## Development Environment Setup

### Prerequisites
```bash
# Required tools
docker --version          # >= 20.10
docker compose --version  # >= 2.0
python --version         # >= 3.10
node --version           # >= 18.x (for frontend)

# Optional (for GPU development)
nvidia-smi               # NVIDIA drivers
nvidia-docker --version  # Container toolkit
```

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd trading-ai

# Start core infrastructure
docker compose up -d postgres redis mock-mcp

# Initialize database
docker compose run --rm backend-initdb

# Start all services (development)
docker compose up --build

# Verify system health
curl http://localhost:8000/health     # Main backend
curl http://localhost:8001/health     # ONNX Runner  
curl http://localhost:8004/health     # FinBERT
curl http://localhost:9000/health     # Mock MCP
```

### Development Workflow
```bash
# Local development (outside containers)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start individual services
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
PYTHONPATH=. python strategy_engine/app.py
PYTHONPATH=. python sentiment_engine/app.py

# Run tests
PYTHONPATH=. pytest -v
PYTHONPATH=. pytest tests/test_strategy_engine.py -v
```

---

## Service Implementation Guidelines

### 1. Main Backend API (Port 8000) - Priority: High

**Current Status**: 🔧 In Progress  
**Directory**: `backend/`  
**Next Actions**:

1. **Complete System Status Endpoint**:
```python
# backend/api/health.py
@app.get("/api/status")
async def get_system_status():
    """Aggregate health from all services"""
    components = {}
    
    # Check each service
    for service in ["onnx_runner", "sentiment_engine", "finbert_server"]:
        try:
            response = await httpx.get(f"http://{service}:8001/health", timeout=5.0)
            components[service] = {
                "name": service.replace("_", " ").title(),
                "status": "ok" if response.status_code == 200 else "error",
                "running": True,
                "version": "1.0.0",
                "details": await response.json()
            }
        except Exception as e:
            components[service] = {
                "name": service.replace("_", " ").title(), 
                "status": "error",
                "running": False,
                "details": str(e)
            }
    
    return SystemStatus(timestamp=datetime.utcnow().isoformat(), components=components)
```

2. **Implement WebSocket Event System**:
```python
# backend/ws_broadcaster.py - Enhance existing
class EventBroadcaster:
    def __init__(self):
        self.clients: Set[WebSocket] = set()
        self.redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"))
    
    async def broadcast_event(self, event_type: str, payload: dict):
        """Broadcast event to all connected clients"""
        message = {"type": event_type, "payload": payload}
        for client in self.clients.copy():
            try:
                await client.send_json(message)
            except Exception:
                self.clients.discard(client)
    
    async def subscribe_to_redis_streams(self):
        """Subscribe to Redis streams and forward to WebSocket clients"""
        # Implementation for Redis Stream → WebSocket forwarding
        pass
```

3. **Add Trading Signals Endpoint**:
```python
# backend/api/signals.py
@app.get("/api/signals")
async def get_signals(
    limit: int = Query(50, le=100),
    cursor: Optional[str] = None,
    symbol: Optional[str] = None,
    min_score: Optional[float] = None
):
    """Get paginated trading signals with filtering"""
    # Query from database or Redis streams
    # Return paginated results with next_cursor
    pass
```

### 2. Strategy Engine (Internal) - Priority: High

**Current Status**: ✅ Enhanced with ML Integration  
**Directory**: `strategy_engine/`  
**Implementation**: `enhanced_strategy_service.py` with ML client integration

**Completed Features**:
- ✅ Multi-factor decision making (technical + ML + sentiment)
- ✅ Dual-path inference (ONNX + TensorRT with fallback)
- ✅ Real-time price history tracking for ML predictions
- ✅ Enhanced position sizing based on confidence and volatility
- ✅ ML service integration via `ml_client.py`

1. **Next Development Actions**:
```python
# strategy_engine/signal_processor.py
class SignalProcessor:
    def __init__(self):
        self.redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"))
        self.risk_calculator = RiskCalculator()
        self.mcp_client = MCPClient()
    
    async def process_signal(self, signal: Signal):
        """Process incoming signal and generate trading decision"""
        # 1. Validate signal
        if abs(signal.score) < 0.3:
            return None
        
        # 2. Get account context
        holdings = await self.mcp_client.get_holdings()
        
        # 3. Calculate position size
        position_size = self.risk_calculator.calculate_size(
            signal, holdings, risk_limit=0.02
        )
        
        # 4. Generate order decision
        if position_size > 0:
            order = OrderDecision(
                symbol=signal.symbol,
                side="BUY" if signal.score > 0 else "SELL",
                quantity=position_size,
                confidence=abs(signal.score)
            )
            
            # 5. Publish to execution queue
            await self.publish_order(order)
            return order
```

2. **Implement Risk Calculator**:
```python
# strategy_engine/calculator.py - Enhance existing
class RiskCalculator:
    def calculate_size(self, signal: Signal, holdings: dict, risk_limit: float = 0.02):
        """Calculate position size based on risk management rules"""
        account_value = holdings.get("total_value", 100000)
        max_risk = account_value * risk_limit
        
        # Simple volatility-based sizing
        volatility = self.estimate_volatility(signal.symbol)
        if volatility == 0:
            return 0
            
        position_size = max_risk / (volatility * signal.score)
        return max(0, min(position_size, account_value * 0.1))  # Cap at 10%
```

### 3. ONNX Runner (Port 8001) - Priority: High

**Current Status**: 🔧 In Progress  
**Directory**: Root level, `Dockerfile.onnx_runner`  
**Next Actions**:

1. **Complete Model Management System**:
```python
# onnx_runner/model_manager.py
class ModelManager:
    def __init__(self, model_dir: str = "/models"):
        self.model_dir = model_dir
        self.loaded_models = {}
        self.load_all_models()
    
    def load_model(self, model_name: str):
        """Load ONNX model with error handling"""
        model_path = f"{self.model_dir}/{model_name}.onnx"
        try:
            session = onnxruntime.InferenceSession(
                model_path, 
                providers=['CPUExecutionProvider']
            )
            self.loaded_models[model_name] = {
                "session": session,
                "input_names": [i.name for i in session.get_inputs()],
                "output_names": [o.name for o in session.get_outputs()],
                "loaded_at": datetime.utcnow()
            }
            logger.info(f"Loaded model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load {model_name}: {e}")
```

2. **Add Batch Processing Support**:
```python
# onnx_runner/batch_processor.py
class BatchProcessor:
    def __init__(self, model_manager: ModelManager, batch_size: int = 32):
        self.model_manager = model_manager
        self.batch_size = batch_size
        self.pending_requests = []
        self.processing_task = None
    
    async def add_request(self, model_name: str, input_data: np.ndarray) -> dict:
        """Add request to batch processing queue"""
        future = asyncio.Future()
        self.pending_requests.append({
            "model_name": model_name,
            "input_data": input_data,
            "future": future,
            "timestamp": time.time()
        })
        
        if not self.processing_task:
            self.processing_task = asyncio.create_task(self.process_batch())
        
        return await future
```

### 4. Sentiment Engine (Port 8002) - Priority: Medium

**Current Status**: 🔧 In Progress  
**Directory**: `sentiment_engine/`  
**Next Actions**:

1. **Add Multi-Source Data Integration**:
```python
# sentiment_engine/data_sources.py
class SentimentDataSources:
    def __init__(self):
        self.finbert_client = FinBERTClient("http://finbert_server:8004")
        self.news_apis = [NewsAPI(), AlphaVantageNews()]
    
    async def analyze_symbol(self, symbol: str) -> SentimentAnalysis:
        """Aggregate sentiment from multiple sources"""
        results = []
        
        # Get recent news
        news_items = await self.get_recent_news(symbol)
        
        # Analyze each news item
        for item in news_items:
            sentiment = await self.finbert_client.analyze(item.text)
            results.append({
                "source": item.source,
                "sentiment": sentiment.score,
                "authenticity": self.calculate_authenticity_score(item),
                "timestamp": item.timestamp
            })
        
        # Aggregate results
        return self.aggregate_sentiment(results)
```

### 5. Pattern Engine - Priority: Medium

**Current Status**: ✅ Implemented with Signal Generation  
**Directory**: `pattern_engine/`  
**Implementation**: `pattern_detector.py` with EMA/VWAP pattern detection

**Completed Features**:
- ✅ Real-time pattern detection (EMA crossover, VWAP, volatility)
- ✅ Redis stream signal publishing
- ✅ Mock tick data generation for development
- ✅ Signal strength scoring and filtering

**Next Actions**:

1. **Optimize State Management**:
```python
# pattern_engine/state.py - Enhance existing
class OptimizedSymbolState:
    def __init__(self, symbol: str):
        self.symbol = symbol
        self.ema_fast = EMA(alpha=0.1)      # 10-period
        self.ema_slow = EMA(alpha=0.05)     # 20-period
        self.vwap = VWAP()
        self.volume_sma = SMA(window=20)
        self.last_signals = deque(maxlen=100)
        
    def update(self, tick: Tick) -> Optional[Signal]:
        """Update state and generate signal if pattern detected"""
        # Update all indicators
        self.ema_fast.update(tick.price)
        self.ema_slow.update(tick.price) 
        self.vwap.update(tick.price, tick.volume)
        self.volume_sma.update(tick.volume)
        
        # Pattern detection
        signal_score = self.detect_patterns()
        
        if abs(signal_score) > 0.3:  # Threshold for signal generation
            signal = Signal(
                symbol=self.symbol,
                score=signal_score,
                timestamp=tick.timestamp,
                meta=self.get_state_metadata()
            )
            self.last_signals.append(signal)
            return signal
        
        return None
```

2. **Add TensorRT Integration**:
```python
# pattern_engine/trt_engine.py - Enhance existing
class TRTPatternEngine:
    def __init__(self, engine_path: str):
        if not has_tensorrt():
            raise RuntimeError("TensorRT not available")
        
        self.engine = self.load_engine(engine_path)
        self.context = self.engine.create_execution_context()
        self.cuda_context = pycuda.driver.Device(0).make_context()
        
    async def predict_async(self, features: np.ndarray) -> float:
        """Async TensorRT inference with proper CUDA context management"""
        with self.cuda_context:
            # Prepare buffers
            # Run inference
            # Return results
            pass
```

---

## ✅ Recently Completed: ML Integration

### Strategy Engine Enhancement
The Strategy Engine has been enhanced with comprehensive ML integration:

**Files Created**:
- `strategy_engine/ml_client.py` - HTTP clients for ML services
- `strategy_engine/enhanced_strategy_service.py` - Enhanced trading strategy
- `pattern_engine/pattern_detector.py` - Pattern detection service

**Integration Features**:
```python
# Multi-service ML client with parallel inference
class MLServiceManager:
    async def get_enhanced_analysis(self, symbol: str, history: List[float]):
        """Get combined ML analysis from ONNX, TensorRT, and Sentiment services"""
        results = await asyncio.gather(
            self.onnx_client.predict(history),
            self.sentiment_client.analyze_symbol(symbol),
            self.tensorrt_client.predict(history),
            return_exceptions=True
        )
        return self.combine_results(results)
```

**Service Dependencies Updated**:
- Strategy Engine now depends on ONNX Runner, Sentiment Engine
- Docker Compose configured with ML service environment variables
- Enhanced decision making with 8 factors (technical + ML + sentiment)

---

## Integration Patterns

### Service-to-Service Communication

**Redis Streams Pattern**:
```python
# Publisher service
async def publish_signal(signal: Signal):
    redis_client.xadd(
        "signals:global",
        {
            "id": signal.id,
            "symbol": signal.symbol,
            "score": str(signal.score),
            "timestamp": signal.timestamp,
            "meta": json.dumps(signal.meta)
        }
    )

# Consumer service  
async def consume_signals():
    consumer_group = "strategy_consumers"
    consumer_name = f"strategy_{os.getpid()}"
    
    while True:
        messages = redis_client.xreadgroup(
            consumer_group,
            consumer_name,
            {"signals:global": ">"},
            count=10,
            block=1000
        )
        
        for stream_name, msgs in messages:
            for msg_id, fields in msgs:
                try:
                    signal = Signal.parse(fields)
                    await process_signal(signal)
                    redis_client.xack("signals:global", consumer_group, msg_id)
                except Exception as e:
                    logger.error(f"Error processing signal {msg_id}: {e}")
```

**HTTP Client Pattern**:
```python
# Resilient HTTP client with circuit breaker
class ResilientHTTPClient:
    def __init__(self, base_url: str, timeout: float = 5.0):
        self.base_url = base_url
        self.timeout = timeout
        self.circuit_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)
    
    async def get(self, path: str, **kwargs):
        if self.circuit_breaker.is_open():
            raise CircuitBreakerOpenError("Service unavailable")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}{path}",
                    timeout=self.timeout,
                    **kwargs
                )
                response.raise_for_status()
                self.circuit_breaker.record_success()
                return response
        except Exception as e:
            self.circuit_breaker.record_failure()
            raise
```

### Database Integration

**SQLAlchemy Async Pattern**:
```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db_session():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Service usage
async def create_trade(trade_data: dict):
    async with AsyncSessionLocal() as session:
        trade = Trade(**trade_data)
        session.add(trade)
        await session.commit()
        await session.refresh(trade)
        return trade
```

---

## Testing Strategy

### Unit Testing
```python
# tests/test_strategy_engine.py
import pytest
from unittest.mock import AsyncMock, patch
from strategy_engine.signal_processor import SignalProcessor

@pytest.fixture
async def signal_processor():
    processor = SignalProcessor()
    processor.mcp_client = AsyncMock()
    processor.redis_client = AsyncMock()
    return processor

@pytest.mark.asyncio
async def test_signal_processing(signal_processor):
    # Mock dependencies
    signal_processor.mcp_client.get_holdings.return_value = {"total_value": 100000}
    
    # Create test signal
    signal = Signal(symbol="AAPL", score=0.75, timestamp="2025-09-27T10:00:00Z")
    
    # Process signal
    result = await signal_processor.process_signal(signal)
    
    # Assertions
    assert result is not None
    assert result.symbol == "AAPL"
    assert result.side == "BUY"
    assert result.quantity > 0
```

### Integration Testing
```python
# tests/test_integration.py
@pytest.mark.integration
async def test_signal_to_execution_flow():
    """Test complete signal processing flow"""
    # Start test services
    async with TestServices() as services:
        # Generate test signal
        signal = await services.pattern_engine.generate_signal("AAPL", test_data)
        
        # Verify signal received by strategy engine
        await asyncio.sleep(0.1)  # Allow for processing
        orders = await services.strategy_engine.get_pending_orders()
        
        assert len(orders) == 1
        assert orders[0].symbol == "AAPL"
```

### Performance Testing
```python
# tests/test_performance.py
@pytest.mark.performance
async def test_signal_processing_latency():
    """Ensure signal processing meets latency requirements"""
    processor = SignalProcessor()
    
    # Generate test signals
    signals = [create_test_signal() for _ in range(1000)]
    
    # Measure processing time
    start_time = time.time()
    
    tasks = [processor.process_signal(signal) for signal in signals]
    results = await asyncio.gather(*tasks)
    
    end_time = time.time()
    
    # Assert latency requirements
    avg_latency = (end_time - start_time) / len(signals)
    assert avg_latency < 0.001  # < 1ms per signal
```

---

## Deployment & Operations

### Docker Development
```yaml
# docker-compose.override.yml (local development)
version: '3.8'
services:
  backend:
    volumes:
      - ./backend:/app/backend:ro
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    
  strategy_engine:
    volumes:
      - ./strategy_engine:/app/strategy_engine:ro
    environment:
      - DEBUG=true
```

### Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    
  postgres:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
```

### Monitoring Setup
```python
# monitoring/metrics.py
from prometheus_client import Counter, Histogram, start_http_server

# Define metrics
SIGNALS_PROCESSED = Counter('signals_processed_total', 'Total signals processed')
SIGNAL_PROCESSING_TIME = Histogram('signal_processing_seconds', 'Signal processing time')
ORDERS_GENERATED = Counter('orders_generated_total', 'Total orders generated')

# Instrument code
@SIGNAL_PROCESSING_TIME.time()
async def process_signal(signal: Signal):
    result = await _do_process_signal(signal)
    SIGNALS_PROCESSED.inc()
    if result:
        ORDERS_GENERATED.inc()
    return result

# Start metrics server
start_http_server(8090)
```

---

## Common Pitfalls & Solutions

### Memory Management in ML Services

**Problem**: ONNX/TensorRT services consuming excessive memory over time

**Solution**:
```python
# onnx_runner/memory_manager.py
class MemoryManager:
    def __init__(self, max_memory_mb: int = 1024):
        self.max_memory_mb = max_memory_mb
        self.current_memory_mb = 0
        
    def check_memory_usage(self):
        """Monitor and cleanup memory usage"""
        process = psutil.Process()
        memory_mb = process.memory_info().rss / 1024 / 1024
        
        if memory_mb > self.max_memory_mb:
            logger.warning(f"Memory usage {memory_mb}MB exceeds limit {self.max_memory_mb}MB")
            # Trigger garbage collection
            gc.collect()
            # Clear model caches if needed
            self.clear_model_cache()
        
        return memory_mb
```

### Redis Connection Management

**Problem**: Redis connection exhaustion under high load

**Solution**:
```python
# redis_pool.py
import redis.asyncio as redis

class RedisManager:
    def __init__(self):
        self.pool = redis.ConnectionPool.from_url(
            os.getenv("REDIS_URL"),
            max_connections=20,
            retry_on_timeout=True
        )
        self.client = redis.Redis(connection_pool=self.pool)
    
    async def close(self):
        await self.pool.disconnect()

# Usage
redis_manager = RedisManager()

async def publish_signal(signal: Signal):
    try:
        await redis_manager.client.xadd("signals:global", signal.dict())
    except redis.RedisError as e:
        logger.error(f"Redis error: {e}")
        # Implement fallback strategy
```

### GPU Context Management

**Problem**: CUDA context conflicts in multi-threaded TensorRT usage

**Solution**:
```python
# trt_context_manager.py
import threading
from contextlib import contextmanager

class TRTContextManager:
    def __init__(self):
        self.contexts = {}
        self.lock = threading.Lock()
    
    @contextmanager
    def get_context(self):
        thread_id = threading.get_ident()
        
        with self.lock:
            if thread_id not in self.contexts:
                # Create new CUDA context for this thread
                self.contexts[thread_id] = self.create_cuda_context()
        
        context = self.contexts[thread_id]
        context.push()
        try:
            yield context
        finally:
            context.pop()
```

---

## Next Steps & Implementation Priority

### Immediate Actions (This Sprint)
1. ✅ Complete system status endpoint (`/api/status`)
2. ✅ Implement WebSocket real-time events
3. ✅ Add trading signals API (`/api/signals`)
4. ✅ Complete ONNX Runner model serving

### Short Term (Next Sprint)
1. Complete Strategy Engine signal processing
2. Add risk calculation and position sizing
3. Implement execution simulator
4. Add comprehensive error handling

### Medium Term (Next Month)
1. Native Pattern Engine implementation (Rust/C++)
2. TensorRT Runner for GPU acceleration
3. Production monitoring and alerting
4. Performance optimization

### Long Term (Next Quarter)
1. Real broker integration
2. Advanced ML models (transformers, ensembles)
3. Distributed deployment (Kubernetes)
4. Comprehensive backtesting framework

---

## Support & Resources

**Getting Help**:
- Architecture questions: Review [BACKEND_ARCH.md](../architecture/BACKEND_ARCH.md)
- API contracts: Reference [BACKEND_INTERFACES.md](../architecture/BACKEND_INTERFACES.md)
- Frontend integration: See [FRONTEND_INSTRUCTIONS.md](../frontend/FRONTEND_INSTRUCTIONS.md)

**Development Tools**:
- VS Code with Python, Docker extensions
- Redis CLI for debugging streams
- PostgreSQL client for database inspection
- Postman/curl for API testing

**Useful Commands**:
```bash
# Service debugging
docker compose logs -f backend
docker compose exec redis redis-cli
docker compose exec postgres psql -U postgres aitrader

# Testing
pytest -v --cov=backend tests/
pytest -m "not integration" tests/  # Skip integration tests
pytest -k "test_signal" tests/      # Run specific tests

# Performance profiling
py-spy top --pid $(pgrep -f "strategy_engine")
```

---

*Document Version: 1.0*  
*Last Updated: September 27, 2025*  
*Next Review: October 15, 2025*