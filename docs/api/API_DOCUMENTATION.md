# Enhanced Predictions & Sentiment API Documentation

## Overview

The AITrader system now includes comprehensive API endpoints for ML predictions and sentiment analysis, designed to support the enhanced frontend components with real-time data, filtering, and pagination.

## Predictions API

### Endpoints

#### GET `/api/predictions`
Retrieve ML model predictions with optional filtering and pagination.

**Query Parameters:**
- `symbol` (optional): Filter by symbol (e.g., "AAPL")
- `model` (optional): Filter by model type ("N-BEATS", "LSTM", "Transformer")
- `since` (optional): Filter predictions since ISO timestamp
- `horizon` (optional): Filter by forecast horizon (integer hours)
- `limit` (optional): Number of predictions to return (default: 20, max: 100)
- `cursor` (optional): Pagination cursor

**Response:**
```json
{
  "predictions": [
    {
      "id": "pred_001",
      "symbol": "AAPL",
      "time": "2025-09-28T14:30:00Z",
      "values": [175.25, 176.10, 177.80, 179.20, 180.15],
      "horizon": 5,
      "model": "N-BEATS",
      "confidence": 0.87
    }
  ],
  "nextCursor": "20",
  "hasMore": true,
  "total": 45
}
```

#### GET `/api/predictions/{prediction_id}`
Retrieve a specific prediction by ID.

**Response:**
```json
{
  "id": "pred_001",
  "symbol": "AAPL",
  "time": "2025-09-28T14:30:00Z",
  "values": [175.25, 176.10, 177.80, 179.20, 180.15],
  "horizon": 5,
  "model": "N-BEATS",
  "confidence": 0.87
}
```

### Data Models

#### Prediction
- `id`: Unique prediction identifier
- `symbol`: Stock symbol
- `time`: ISO timestamp when prediction was made
- `values`: Array of predicted prices (current + forecast)
- `horizon`: Forecast horizon in hours (optional)
- `model`: ML model used ("N-BEATS", "LSTM", "Transformer", etc.)
- `confidence`: Prediction confidence score 0.0-1.0 (optional)

## Sentiment API

### Endpoints

#### GET `/api/sentiment`
Retrieve sentiment analysis data with optional filtering and pagination.

**Query Parameters:**
- `symbol` (optional): Filter by symbol (e.g., "AAPL")
- `window` (optional): Filter by time window ("1h", "4h", "1d", "1w")
- `sources` (optional): Filter by sources (comma-separated list)
- `since` (optional): Filter sentiment since ISO timestamp
- `limit` (optional): Number of sentiment entries to return (default: 20, max: 100)
- `cursor` (optional): Pagination cursor

**Response:**
```json
{
  "sentiment": [
    {
      "symbol": "AAPL",
      "score": 0.65,
      "window": "1h",
      "timestamp": "2025-09-28T14:30:00Z",
      "sources": ["Reuters", "Bloomberg", "WSJ"]
    }
  ],
  "nextCursor": "20",
  "hasMore": true,
  "total": 32
}
```

#### GET `/api/sentiment/{symbol}`
Retrieve sentiment data for a specific symbol.

**Response:**
```json
[
  {
    "symbol": "AAPL",
    "score": 0.65,
    "window": "1h",
    "timestamp": "2025-09-28T14:30:00Z",
    "sources": ["Reuters", "Bloomberg", "WSJ"]
  }
]
```

### Data Models

#### SentimentData
- `symbol`: Stock symbol
- `score`: Sentiment score -1.0 (very bearish) to +1.0 (very bullish)
- `window`: Time window for analysis ("1h", "4h", "1d", "1w")
- `timestamp`: ISO timestamp of sentiment analysis
- `sources`: Array of news sources used in analysis (optional)

## Integration with Existing Services

### FinBERT Integration
The sentiment API integrates with the existing `sentiment_engine` service which:
- Uses FinBERT model for finance-tuned sentiment analysis
- Falls back to rule-based sentiment when FinBERT unavailable
- Connects to optional `finbert_server` for dedicated model serving
- Includes authenticity scoring based on source reliability

### ONNX Runner Integration
The predictions API can integrate with the existing `onnx_runner` service for:
- N-BEATS model inference for time series forecasting
- TensorRT acceleration for GPU-enabled predictions
- Batch processing for multiple symbol predictions

## Development & Testing

### Fixture Data
Both APIs use fixture data during development:
- `frontend/fixtures/predictions.json` - Sample prediction data
- `frontend/fixtures/sentiment.json` - Sample sentiment data

### Error Handling
- Development: Falls back to fixture data on API errors
- Production: Returns appropriate HTTP status codes with error details
- Logging: Comprehensive error logging for debugging

### Performance Considerations
- Pagination: Cursor-based pagination for large datasets
- Caching: Future implementation of Redis caching for frequently accessed data
- Rate Limiting: Future implementation of rate limiting for API protection

## Docker Services

### New Services Added
- `sentiment_engine`: Port 8002, FinBERT sentiment analysis
- `finbert_server`: Port 5000, dedicated FinBERT model server
- `tensorrt_runner`: Port 8007, GPU-accelerated inference

### Environment Variables
- `DATABASE_URL`: PostgreSQL database connection string
- `REDIS_URL`: Redis connection string for messaging and caching
- `MCP_URL`: Mock MCP service URL for development
- `FINBERT_URL`: URL of FinBERT server (optional)
- `ONNX_MODEL_PATH`: Path to ONNX model files
- `TRT_ENGINE_PATH`: Path to TensorRT engine files
- `ONNX_RUNNER_URL`: ONNX Runner service URL
- `SENTIMENT_ENGINE_URL`: Sentiment Engine service URL
- `TENSORRT_RUNNER_URL`: TensorRT Runner service URL

## Frontend Integration

### React Hooks
- `usePredictions()`: Manages prediction data with filtering and pagination
- `useSentiment()`: Manages sentiment data with real-time updates

### Components
- `PredictionsPage`: Enhanced ML forecasts with confidence visualization
- `SentimentPage`: FinBERT sentiment analysis with source tracking
- Glass morphism UI consistent with overall design system

### WebSocket Events
Future implementation will include WebSocket events for:
- `prediction`: Real-time prediction updates
- `sentiment`: Real-time sentiment score changes

## Future Enhancements

1. **Real-time Streaming**: WebSocket integration for live updates
2. **Advanced Filtering**: More sophisticated query capabilities
3. **Model Performance Tracking**: Historical accuracy and performance metrics
4. **Alert System**: Notifications for significant sentiment or prediction changes
5. **Batch Processing**: APIs for bulk prediction and sentiment requests