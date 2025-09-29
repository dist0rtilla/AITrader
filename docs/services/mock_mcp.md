# Mock MCP Service Documentation

## Overview

The Mock MCP (Model Context Protocol) service provides a lightweight simulation of broker API endpoints for AITrader development and testing. This enables full system integration testing without requiring actual broker API access.

## Architecture Integration

```
┌─────────────────┐    HTTP    ┌─────────────────┐
│ Strategy Engine │ ────────→  │   Mock MCP      │
│                 │            │   Service       │
├─────────────────┤            ├─────────────────┤
│ Backend Service │ ────────→  │ Port: 9000      │
│                 │            │                 │
└─────────────────┘            └─────────────────┘
                                       │
                               ┌───────▼────────┐
                               │  Mock Data:    │
                               │ • Holdings     │
                               │ • Positions    │
                               │ • Orders       │
                               │ • Auth Tokens  │
                               └────────────────┘
```

## Service Details

### **Port**: 9000
### **Base URL**: `http://localhost:9000` (development)
### **Health Check**: `GET /health`

## API Endpoints

### Authentication
- `POST /mcp/login` - Mock login (accepts any credentials)
- Returns: `{"token": "mock_token_123", "status": "success"}`

### Portfolio Data
- `GET /mcp/holdings?token=<token>` - Portfolio holdings
- `GET /mcp/positions?token=<token>` - Trading positions  
- `GET /mcp/orders?token=<token>` - Order history

### Service Status
- `GET /` - Service information
- `GET /health` - Health check endpoint

## Mock Data

### Sample Holdings
```json
{
  "holdings": [
    {"symbol": "AAPL", "quantity": 100, "price": 150.0, "value": 15000.0, "pnl": 500.0},
    {"symbol": "GOOGL", "quantity": 50, "price": 2800.0, "value": 140000.0, "pnl": -2000.0},
    {"symbol": "MSFT", "quantity": 75, "price": 300.0, "value": 22500.0, "pnl": 1200.0},
    {"symbol": "TSLA", "quantity": 25, "price": 800.0, "value": 20000.0, "pnl": -800.0}
  ],
  "total_value": 197500.0
}
```

### Sample Positions
```json
{
  "positions": [
    {"symbol": "AAPL", "quantity": 100, "side": "long"},
    {"symbol": "GOOGL", "quantity": 50, "side": "long"},
    {"symbol": "MSFT", "quantity": -25, "side": "short"}
  ]
}
```

## Integration Points

### Strategy Engine Integration
The Strategy Engine connects to Mock MCP for account context:

```python
# Environment variable
MCP_URL = "http://mock-mcp:9000/mcp"

# Usage in strategy decisions
holdings = await mcp_client.get_holdings(token)
positions = await mcp_client.get_positions(token)
```

### Backend Service Integration
Backend services can query portfolio data for:
- Risk management calculations
- Position sizing decisions
- Portfolio rebalancing logic

## Development Workflow

1. **Start Services**:
   ```bash
   docker-compose up --build
   ```

2. **Verify Mock MCP**:
   ```bash
   curl http://localhost:9000/health
   ```

3. **Test Authentication**:
   ```bash
   curl -X POST http://localhost:9000/mcp/login \
     -H "Content-Type: application/json" \
     -d '{"username": "dev", "password": "test"}'
   ```

4. **Query Holdings**:
   ```bash
   curl "http://localhost:9000/mcp/holdings?token=mock_token_123"
   ```

## Production Considerations

**⚠️ Development Only**: This service is designed for local development and testing. In production:

- Replace with actual broker API integration
- Implement proper authentication and security
- Use real-time market data feeds
- Add proper error handling and retry logic

## Service Configuration

### Environment Variables
- `PORT`: Service port (default: 9000)

### Docker Configuration
```yaml
mock-mcp:
  build:
    context: .
    dockerfile: Dockerfile.mockmcp
  environment:
    PORT: 9000
  ports:
    - "9000:9000"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://127.0.0.1:9000/health"]
    interval: 15s
    timeout: 5s
    retries: 3
```

## Dependencies

Other services that depend on Mock MCP:
- `strategy_engine` - For account context and risk management
- `backend` - For portfolio queries and user data
- `worker` - For background processing with account data

The service provides a complete development environment that enables full system testing without external broker dependencies.