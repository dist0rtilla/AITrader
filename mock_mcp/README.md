# Mock MCP Service

A lightweight mock implementation of the Model Context Protocol (MCP) for AITrader development and testing.

## Purpose

This service simulates Zerodha MCP endpoints to enable local development without requiring actual broker API access. It provides realistic mock data for:

- Authentication (login/tokens)
- Portfolio holdings
- Trading positions  
- Order history

## Endpoints

- `GET /` - Service information
- `GET /health` - Health check
- `POST /mcp/login` - Mock authentication
- `GET /mcp/holdings` - Portfolio holdings
- `GET /mcp/positions` - Trading positions
- `GET /mcp/orders` - Order history

## Development Usage

### Docker (Recommended)
The service runs automatically as part of the main stack:

```bash
docker compose up --build
# Mock MCP available at http://localhost:9000
```

### Local Development
```bash
cd mock_mcp
pip install -r requirements.txt
python app.py
# Service runs on http://localhost:9000
```

## Authentication

For development, the service accepts any username/password and returns a mock token:

```bash
curl -X POST http://localhost:9000/mcp/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'
```

Response:
```json
{
  "token": "mock_token_123",
  "status": "success", 
  "message": "Login successful (mock)"
}
```

## Sample Data

The service returns realistic mock data for all endpoints:

- **Holdings**: 4 sample stocks (AAPL, GOOGL, MSFT, TSLA) with quantities, prices, and P&L
- **Positions**: Mix of long and short positions
- **Orders**: Sample completed and pending orders

## Environment Variables

- `PORT` - Service port (default: 9000)

## Integration

Other services can integrate with Mock MCP using the `MCP_URL` environment variable:

```bash
export MCP_URL=http://mock-mcp:9000/mcp
```

This enables the Strategy Engine and other components to fetch account context for trading decisions.

## Production Note

This is a **development-only** service. In production, replace with actual broker API integration or proper MCP implementation.