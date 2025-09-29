# AITrader Service Map & Connection Architecture

## Visual Service Map

```mermaid
graph TB
    %% External Inputs
    Market[📈 Market Data] --> TickReplay[Tick Replay<br/>:internal]
    News[📰 News/Social] --> SentimentEngine
    
    %% Core Infrastructure
    subgraph "Infrastructure Layer"
        Redis[🔄 Redis<br/>:6379<br/>Streams & Cache]
        Postgres[🗄️ PostgreSQL<br/>:5432<br/>Persistent Data]
    end
    
    %% Data Pipeline
    subgraph "Data Pipeline"
        TickReplay --> |tick data| Redis
        BookBuilder[📚 Book Builder<br/>:internal] --> |order book| Redis
        Redis --> |signals stream| StrategyEngine
        Redis --> |orders stream| ExecutionEngine
    end
    
    %% Trading Core
    subgraph "Trading Core Services"
        PatternEngine[⚡ Pattern Engine<br/>:internal<br/>Hot Path < 1ms<br/>(Python orchestration + optional Rust hot-path/pyo3)]
        StrategyEngine[🎯 Strategy Engine<br/>:8005<br/>Decision Logic]
        ExecutionEngine[💼 Execution Engine<br/>:8006<br/>Order Management]
    end
    
    %% ML & Analytics
    subgraph "ML & Analytics"
        ONNXRunner[🧠 ONNX Runner<br/>:8001<br/>CPU Inference]
        TensorRTRunner[⚡ TensorRT Runner<br/>:8007<br/>GPU Inference]
        SentimentEngine[💭 Sentiment Engine<br/>:8002<br/>NLP Analysis]
        FinBERT[🎭 FinBERT Server<br/>:8004<br/>Financial Sentiment]
    end
    
    %% API Layer
    subgraph "API & Integration"
        Backend[🌐 Main Backend<br/>:8000<br/>REST API]
        Worker[⚙️ Worker Service<br/>:background<br/>Job Processing]
        MockMCP[🎲 Mock MCP<br/>:9000<br/>Account Simulation]
    end
    
    %% Frontend
    Frontend[🎨 Frontend<br/>:8080<br/>React SPA]
    
    %% Service Connections - Data Flow
    TickReplay --> |raw ticks| PatternEngine
    PatternEngine --> |signals| Redis
    Redis --> |signals:global| StrategyEngine
    
    %% Strategy Engine Connections (MISSING - TO BE IMPLEMENTED)
    StrategyEngine -.-> |HTTP calls| ONNXRunner
    StrategyEngine -.-> |HTTP calls| TensorRTRunner  
    StrategyEngine -.-> |HTTP calls| SentimentEngine
    StrategyEngine --> |HTTP calls| MockMCP
    StrategyEngine --> |orders| Redis
    StrategyEngine <--> |ORM| Postgres
    
    %% Execution Flow
    Redis --> |orders:gateway| ExecutionEngine
    ExecutionEngine --> |fills| Redis
    Redis --> |fills:global| StrategyEngine
    
    %% ML Service Dependencies
    SentimentEngine --> |HTTP calls| FinBERT
    ONNXRunner --> |model files| ModelStorage[📁 ./models/]
    TensorRTRunner --> |TRT engines| ModelStorage
    
    %% Backend Integration
    Backend --> |queries| Postgres
    Backend --> |pub/sub| Redis
    Backend --> |HTTP calls| ONNXRunner
    Backend --> |HTTP calls| SentimentEngine
    Backend --> |WebSocket| Frontend
    
    %% Worker Jobs
    Worker --> |consume jobs| Redis
    Worker --> |training jobs| ONNXRunner
    Worker <--> |job status| Postgres
    
    %% Frontend Connections  
    Frontend --> |HTTP/WS| Backend
    Frontend --> |direct calls| ONNXRunner
    Frontend --> |direct calls| SentimentEngine
    
    %% Styling
    classDef infrastructure fill:#e1f5fe
    classDef trading fill:#f3e5f5  
    classDef ml fill:#e8f5e8
    classDef api fill:#fff3e0
    classDef frontend fill:#fce4ec
    classDef missing stroke:#ff5722,stroke-width:3px,stroke-dasharray: 5 5
    
    class Redis,Postgres infrastructure
    class PatternEngine,StrategyEngine,ExecutionEngine trading
    class ONNXRunner,TensorRTRunner,SentimentEngine,FinBERT ml
    class Backend,Worker,MockMCP api
    class Frontend frontend
```

## Current Connection Status

### ✅ **Implemented Connections**

**Strategy Engine Currently Connected To:**
- 🔄 **Redis** (port 6379) - Signal consumption via `signals` channel
- 🗄️ **PostgreSQL** (port 5432) - Execution logging via SQLAlchemy ORM  
- 🎲 **Mock MCP** (port 9000) - Account data (minimal usage)

**Data Flow Working:**
1. Pattern Engine → Redis (`signals` channel)
2. Strategy Engine ← Redis (consumes `signals`)
3. Strategy Engine → Redis (`orders` channel) 
4. Strategy Engine → PostgreSQL (execution logging)

### ❌ **Missing Critical Connections**

**Strategy Engine Should Connect To:**
- 🧠 **ONNX Runner** (port 8001) - Price predictions for decision making
- 💭 **Sentiment Engine** (port 8002) - Sentiment analysis for symbol filtering
- ⚡ **TensorRT Runner** (port 8007) - GPU-accelerated predictions
- 💼 **Execution Engine** (port 8006) - Proper order management

**Missing Integration Points:**
- No ML model consultation for trade decisions
- No sentiment analysis integration  
- No sophisticated risk management
- Limited MCP account context usage

---

## Service Connection Implementation Guide

### 1. Strategy Engine → ONNX Runner Integration

**Purpose**: Get price predictions to improve trade decisions

**Implementation**:
```python
# strategy_engine/ml_client.py
import httpx
import asyncio

class ONNXClient:
    def __init__(self, base_url: str = "http://onnx_runner:8001"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=2.0)
    
    async def get_prediction(self, symbol: str, history: list) -> dict:
        """Get N-BEATS forecast for symbol"""
        try:
            response = await self.client.post(
                f"{self.base_url}/infer/forecast/nbeats",
                json={
                    "symbol": symbol,
                    "history": history[-60:],  # Last 60 data points
                    "horizon": 10
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"ONNX prediction failed for {symbol}: {e}")
            return {"forecast": [0.0], "confidence": [0.0]}
```

### 2. Strategy Engine → Sentiment Engine Integration

**Purpose**: Filter trades based on sentiment analysis

**Implementation**:
```python
# strategy_engine/sentiment_client.py
import httpx

class SentimentClient:
    def __init__(self, base_url: str = "http://sentiment_engine:8002"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=1.0)
    
    async def get_symbol_sentiment(self, symbol: str) -> float:
        """Get aggregated sentiment score for symbol (-1 to 1)"""
        try:
            response = await self.client.get(
                f"{self.base_url}/api/sentiment",
                params={"symbol": symbol, "window": "1h"}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("sentiment_score", 0.0)
        except Exception as e:
            print(f"Sentiment lookup failed for {symbol}: {e}")
            return 0.0  # Neutral sentiment on error
```

### 3. Enhanced Strategy Decision Engine

**Updated decision logic integrating all services**:

```python
# strategy_engine/enhanced_strategy.py
import asyncio
from typing import Optional
from .ml_client import ONNXClient
from .sentiment_client import SentimentClient

class EnhancedStrategyEngine:
    def __init__(self):
        self.onnx_client = ONNXClient()
        self.sentiment_client = SentimentClient()
        self.calculator = get_calculator()
    
    async def enhanced_decide_and_order(self, signal: dict):
        """Enhanced decision making with ML and sentiment"""
        symbol = signal['symbol']
        signal_score = float(signal.get('score', 0.0))
        
        # Skip weak signals
        if abs(signal_score) < 0.3:
            return None
        
        # Get technical indicators
        sma20 = self.calculator.sma(symbol, 20)
        rsi14 = self.calculator.rsi(symbol, 14)
        atr14 = self.calculator.atr(symbol, 14)
        
        # Get price history for ML prediction
        price_history = self.calculator.get_price_history(symbol, 60)
        
        # Parallel ML and sentiment analysis
        prediction_task = self.onnx_client.get_prediction(symbol, price_history)
        sentiment_task = self.sentiment_client.get_symbol_sentiment(symbol)
        
        try:
            prediction, sentiment = await asyncio.gather(
                prediction_task, 
                sentiment_task,
                timeout=3.0
            )
        except asyncio.TimeoutError:
            print(f"ML/Sentiment timeout for {symbol}, using technical only")
            prediction = {"forecast": [0.0], "confidence": [0.0]}
            sentiment = 0.0
        
        # Enhanced decision logic
        forecast = prediction.get("forecast", [0.0])[0]
        confidence = prediction.get("confidence", [0.0])[0]
        
        # Multi-factor scoring
        factors = {
            "signal_score": signal_score,
            "forecast_direction": 1.0 if forecast > 0 else -1.0,
            "forecast_confidence": confidence,
            "sentiment": sentiment,
            "rsi_filter": 1.0 if (rsi14 or 50) < 70 else -0.5,  # Avoid overbought
            "volatility": atr14 or 1.0
        }
        
        # Combined score calculation
        combined_score = (
            factors["signal_score"] * 0.4 +
            factors["forecast_direction"] * factors["forecast_confidence"] * 0.3 +
            factors["sentiment"] * 0.2 +
            factors["rsi_filter"] * 0.1
        )
        
        # Position sizing based on volatility and confidence
        base_position = 100  # Base position size
        volatility_adj = 1.0 / (factors["volatility"] + 0.1)  # Reduce size for high volatility
        confidence_adj = (abs(combined_score) + confidence) / 2.0
        
        position_size = int(base_position * volatility_adj * confidence_adj)
        position_size = max(1, min(position_size, 1000))  # Cap between 1-1000
        
        # Trade decision
        if combined_score > 0.4:  # Bullish threshold
            side = "BUY"
        elif combined_score < -0.4:  # Bearish threshold  
            side = "SELL"
        else:
            print(f"No trade for {symbol}: combined_score={combined_score:.3f}")
            return None
        
        # Create enhanced order
        order = {
            "id": str(uuid.uuid4()),
            "symbol": symbol,
            "side": side,
            "qty": position_size,
            "type": "MARKET",
            "strategy": "enhanced_ml_sentiment",
            "factors": factors,
            "combined_score": combined_score
        }
        
        # Log decision factors for analysis
        print(f"Enhanced order for {symbol}: {side} {position_size} shares")
        print(f"  Factors: signal={signal_score:.3f}, forecast={forecast:.3f}, "
              f"sentiment={sentiment:.3f}, combined={combined_score:.3f}")
        
        return order
```

### 4. Service Health Monitoring

**Add health checks for all connections**:

```python
# strategy_engine/health_monitor.py
import asyncio
import httpx
from typing import Dict

class ServiceHealthMonitor:
    def __init__(self):
        self.services = {
            "onnx_runner": "http://onnx_runner:8001/health",
            "sentiment_engine": "http://sentiment_engine:8002/health", 
            "tensorrt_runner": "http://tensorrt_runner:8007/health",
            "mock_mcp": "http://mock-mcp:9000/health"
        }
        self.health_status = {}
    
    async def check_all_services(self) -> Dict[str, bool]:
        """Check health of all connected services"""
        tasks = []
        for service, url in self.services.items():
            tasks.append(self._check_service(service, url))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, (service, _) in enumerate(self.services.items()):
            if isinstance(results[i], Exception):
                self.health_status[service] = False
            else:
                self.health_status[service] = results[i]
        
        return self.health_status
    
    async def _check_service(self, service: str, url: str) -> bool:
        """Check individual service health"""
        try:
            async with httpx.AsyncClient(timeout=1.0) as client:
                response = await client.get(url)
                return response.status_code == 200
        except Exception:
            return False
```

### 5. Docker Compose Service Dependencies

**Update docker-compose.yml to reflect all connections**:

```yaml
# Enhanced strategy_engine service definition
strategy_engine:
  build:
    context: .
    dockerfile: Dockerfile.backend
  command: ["python", "-u", "strategy_engine/strategy_service.py"]
  environment:
    REDIS_URL: redis://redis:6379/0
    MCP_URL: http://mock-mcp:9000/mcp
    ONNX_URL: http://onnx_runner:8001
    SENTIMENT_URL: http://sentiment_engine:8002
    TENSORRT_URL: http://tensorrt_runner:8007
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/aitrader
  depends_on:
    - redis
    - postgres
    - mock-mcp
    - onnx_runner
    - sentiment_engine
  healthcheck:
    test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8005/health')"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Implementation notes (Pattern Engine)

- The diagram shows `Pattern Engine` as a logical service. In the codebase this service is implemented as a Python orchestration layer (runners, detector, Redis publishers). For low-latency hot-paths a Rust crate exists under `pattern_engine/` and is exposed to Python via a small pyo3 extension (`pattern_engine/pyo3_wrapper`). The project intentionally separates the logical service (what the map shows) from implementation detail (language/runtime).

- Practical implications for developers:
    - The Python modules provide the orchestration and fallbacks. Heavy inference libraries (onnxruntime, TensorRT) are imported lazily at runtime to avoid import-time failures on CPU-only developer machines.
    - If present, the pyo3 extension allows the Rust hot-path to be invoked in-process (lower latency) instead of spawning a binary.

- Recommended CI/Developer step: add a CI job that builds the pyo3 extension (for example using `maturin`) and runs a small smoke test that imports `pattern_engine_pyo3` and calls `run_replay_publish` (see `pattern_engine/pyo3_wrapper/README.md` for API). This ensures the Python/Rust integration stays healthy.

---

## Implementation Priority

### Phase 1: Core ML Integration (High Priority)
1. ✅ Add ONNX Runner HTTP client to Strategy Engine
2. ✅ Integrate price predictions into decision logic
3. ✅ Add error handling and fallback mechanisms
4. ✅ Update docker-compose dependencies

### Phase 2: Sentiment Integration (Medium Priority)  
1. ✅ Add Sentiment Engine HTTP client
2. ✅ Integrate sentiment scoring into decisions
3. ✅ Add symbol-level sentiment filtering
4. ✅ Cache sentiment results for performance

### Phase 3: Advanced Features (Low Priority)
1. Add TensorRT Runner parallel processing
2. Implement A/B testing between models
3. Add portfolio-level risk management
4. Implement advanced position sizing algorithms

---

## Connection Testing & Validation

### Service Connectivity Tests
```bash
# Test Strategy Engine connections
docker compose exec strategy_engine python -c "
import requests
import json

services = {
    'onnx': 'http://onnx_runner:8001/health',
    'sentiment': 'http://sentiment_engine:8002/health', 
    'mcp': 'http://mock-mcp:9000/health'
}

for name, url in services.items():
    try:
        r = requests.get(url, timeout=2)
        print(f'{name}: {r.status_code} - {r.text[:50]}')
    except Exception as e:
        print(f'{name}: ERROR - {e}')
"
```

### End-to-End Signal Flow Test
```bash
# Publish test signal and verify processing
docker compose exec redis redis-cli PUBLISH signals '{"symbol": "AAPL", "score": 0.75, "timestamp": "2025-09-27T10:00:00Z"}'

# Check strategy engine logs
docker compose logs -f strategy_engine | grep AAPL

# Verify database entries
docker compose exec postgres psql -U postgres aitrader -c "SELECT * FROM executions WHERE symbol='AAPL' ORDER BY created_at DESC LIMIT 5;"
```

This comprehensive service map and connection guide addresses the missing Strategy Engine integrations and provides a clear implementation path for connecting all services according to the architecture specifications.