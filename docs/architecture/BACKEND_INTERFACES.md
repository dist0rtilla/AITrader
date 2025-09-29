# Backend API Interfaces Specification

This document defines all API interfaces between the frontend and backend services in the AITrader system. Each interface includes endpoint specifications, request/response schemas, development status, and implementation notes.

## Interface Development Status Legend

- ✅ **Implemented** - Fully implemented and tested
- 🔧 **In Progress** - Partially implemented, may have basic functionality
- 📋 **Planned** - Defined but not yet implemented  
- ❌ **Not Started** - No implementation exists
- 🚧 **Stub/Mock** - Mock implementation for development

---

## Core System API (Main Backend Service)

**Base URL**: `http://localhost:8000/api`  
**Port**: 8000  
**Service**: `backend` (FastAPI)  
**Status**: 🔧 **In Progress**

### System Health & Status

#### GET /api/status
**Status**: 📋 **Planned**  
**Description**: Get overall system health and component status  
**Frontend Usage**: `src/api/healthClient.ts` -> `useSystemStatus` hook  

**Response Schema**:
```typescript
interface SystemStatus {
  timestamp: string;
  components: {
    [componentId: string]: {
      name: string;
      status: 'ok' | 'warn' | 'error';
      running: boolean;
      uptime: string;
      version: string;
      details: string;
    };
  };
  gpus?: Array<{
    id: string;
    name: string;
    memoryTotal: number;
    memoryUsed: number;
    utilization?: number;
  }>;
}
```

#### GET /api/components
**Status**: 📋 **Planned**  
**Description**: List all system components for detailed monitoring  

#### GET /api/components/:id/metrics
**Status**: 📋 **Planned**  
**Description**: Get detailed metrics for a specific component  

#### POST /api/components/:id/restart
**Status**: 📋 **Planned**  
**Description**: Restart a specific component  

### WebSocket Events

#### WS /api/ws/monitor
**Status**: 🔧 **In Progress** (basic heartbeat implemented)  
**Description**: Real-time system monitoring events  
**Frontend Usage**: `src/hooks/useWebSocket.ts`  

**Event Types**:
```typescript
type WebSocketEvent =
  | { type: 'system_status'; payload: SystemStatus }
  | { type: 'signal'; payload: Signal }
  | { type: 'prediction'; payload: Prediction }
  | { type: 'sentiment'; payload: SentimentUpdate };
```

---

## Trading Signals API

**Base URL**: `http://localhost:8000/api`  
**Service**: `backend` -> `strategy_engine` (internal)  
**Status**: 📋 **Planned**

### Signals Endpoints

#### GET /api/signals
**Status**: 📋 **Planned**  
**Description**: Get trading signals with pagination and filtering  
**Frontend Usage**: `src/api/signalsClient.ts` -> `useSignals` hook  

**Query Parameters**:
- `limit?: number` (default: 50)
- `cursor?: string` (for pagination)
- `symbol?: string` (filter by symbol)
- `minScore?: number` (filter by confidence score)
- `since?: string` (ISO timestamp)

**Response Schema**:
```typescript
interface SignalsResponse {
  signals: Signal[];
  nextCursor?: string;
  total: number;
}

interface Signal {
  id: string;
  symbol: string;
  time: string; // ISO timestamp
  score: number; // -1..1 confidence
  side: 'buy' | 'sell' | 'neutral';
  pattern?: string;
  meta?: Record<string, any>;
}
```

#### GET /api/signals/:id
**Status**: 📋 **Planned**  
**Description**: Get detailed information about a specific signal  

---

## Model Predictions API

**Base URL**: `http://localhost:8001/api` (ONNX Runner)  
**Port**: 8001  
**Service**: `onnx_runner` (FastAPI)  
**Status**: 🔧 **In Progress**

### Predictions Endpoints

#### POST /api/infer/forecast/nbeats
**Status**: 🔧 **In Progress**  
**Description**: Run N-BEATS forecasting model  
**Frontend Usage**: `src/api/predictionsClient.ts`  

**Request Schema**:
```typescript
interface ForecastRequest {
  symbol: string;
  history: number[]; // price history
  horizon: number; // forecast horizon
}
```

**Response Schema**:
```typescript
interface ForecastResponse {
  forecast: number[];
  confidence?: number[];
  meta: {
    model: string;
    timestamp: string;
    horizon: number;
  };
}
```

#### GET /api/predictions
**Status**: 📋 **Planned**  
**Description**: Get historical predictions for analysis  
**Frontend Usage**: `src/api/predictionsClient.ts` -> `usePredictions` hook  

---

## Sentiment Analysis API

**Base URL**: `http://localhost:8002/api` (Sentiment Engine)  
**Port**: 8002  
**Service**: `sentiment_engine` (FastAPI)  
**Status**: 🔧 **In Progress**

### Sentiment Endpoints

#### POST /api/analyze
**Status**: 🔧 **In Progress**  
**Description**: Analyze text sentiment using FinBERT  
**Frontend Usage**: `src/api/sentimentClient.ts`  

**Request Schema**:
```typescript
interface AnalyzeRequest {
  text: string;
  source?: string;
}
```

**Response Schema**:
```typescript
interface AnalyzeResponse {
  source?: string;
  authenticity_score: number;
  sentiment_score: number; // -1..1
  summary?: string;
}
```

#### GET /api/sentiment
**Status**: 📋 **Planned**  
**Description**: Get aggregated sentiment data  
**Frontend Usage**: `src/api/sentimentClient.ts` -> `useSentiment` hook  

**Query Parameters**:
- `symbol?: string`
- `window?: string` ('1h', '4h', '1d')
- `limit?: number`

---

## FinBERT Server API

**Base URL**: `http://localhost:8004/api` (FinBERT Server)  
**Port**: 8004  
**Service**: `finbert_server` (Flask)  
**Status**: ✅ **Implemented**

#### GET /health
**Status**: ✅ **Implemented**  
**Description**: Health check for FinBERT model availability  

#### POST /predict
**Status**: ✅ **Implemented**  
**Description**: Direct FinBERT sentiment prediction  

---

## Training & ML Management API

**Base URL**: `http://localhost:8000/api`  
**Service**: `backend` (FastAPI)  
**Status**: 📋 **Planned**

### Training Endpoints

#### POST /api/training/start
**Status**: 📋 **Planned**  
**Description**: Start model training job  
**Frontend Usage**: TrainingPage component  

#### GET /api/training/:id/logs
**Status**: 📋 **Planned**  
**Description**: Get training logs for a job  

#### POST /api/training/:id/stop
**Status**: 📋 **Planned**  
**Description**: Stop a running training job  

---

## Order Execution API

**Base URL**: `http://localhost:8000/api`  
**Service**: `backend` -> `execution_simulator` (internal)  
**Status**: 🚧 **Stub/Mock**

### Execution Endpoints

#### POST /api/executions
**Status**: 🚧 **Stub/Mock**  
**Description**: Submit order for execution  
**Frontend Usage**: ExecutionsPage component  

#### GET /api/executions
**Status**: 📋 **Planned**  
**Description**: Get execution history  

---

## Database Explorer API

**Base URL**: `http://localhost:8000/api`  
**Service**: `backend` (FastAPI)  
**Status**: 📋 **Planned**

### Database Endpoints

#### POST /api/db/query
**Status**: 📋 **Planned**  
**Description**: Execute read-only database queries  
**Frontend Usage**: DBExplorerPage component  

**Security Note**: Must implement SQL injection protection and read-only constraints

---

## External Integrations

### Mock MCP Server

**Base URL**: `http://localhost:9000/mcp`  
**Port**: 9000  
**Service**: `mock-mcp` (Custom)  
**Status**: ✅ **Implemented** (Mock)

**Endpoints**:
- `GET /login` - Mock authentication
- `GET /get_holdings` - Mock portfolio data

---

## Service Port Allocation

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| `postgres` | 5432 | ✅ | PostgreSQL database |
| `redis` | 6379 | ✅ | Redis streams & cache |
| `backend` | 8000 | 🔧 | Main FastAPI backend |
| `onnx_runner` | 8001 | 🔧 | ONNX model inference |
| `sentiment_engine` | 8002 | 🔧 | Sentiment analysis |
| `backend-main` | 8003 | 🔧 | Alternative backend instance |
| `finbert_server` | 8004 | ✅ | FinBERT Flask server |
| `frontend` | 8080 | ✅ | Nginx static frontend |
| `mock-mcp` | 9000 | ✅ | Mock MCP server |

---

## Implementation Priority

### Phase 1 (High Priority)
1. Complete `/api/status` endpoint with real system monitoring
2. Implement `/api/signals` CRUD operations
3. Complete WebSocket event system for real-time updates
4. Finish ONNX Runner prediction endpoints

### Phase 2 (Medium Priority)
1. Implement sentiment aggregation endpoints
2. Add training management endpoints
3. Complete component restart functionality
4. Add database explorer with security

### Phase 3 (Low Priority)
1. Complete execution simulator
2. Add advanced analytics endpoints
3. Implement batch operations
4. Add data export functionality

---

## Development Notes

### Error Handling
All APIs should follow consistent error response format:
```typescript
interface APIError {
  error: string;
  message: string;
  status: number;
  timestamp: string;
}
```

### Authentication
Currently using development mode without authentication. Production implementation should add JWT tokens and role-based access control.

### Rate Limiting
High-frequency endpoints (WebSocket, signals) should implement rate limiting to prevent abuse.

### Data Validation
All endpoints use Pydantic models for request/response validation with proper error messages.

---

*Last Updated: September 27, 2025*  
*Maintainer: Development Team*