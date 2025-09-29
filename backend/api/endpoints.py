"""
Backend API for predictions and sentiment endpoints.
Follows FastAPI patterns with Pydantic models and development fixtures.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Router for API endpoints
api_router = APIRouter(prefix="/api")

# Pydantic models
class Prediction(BaseModel):
    id: str
    symbol: str
    time: str  # ISO timestamp
    values: List[float]
    horizon: Optional[int] = None
    model: Optional[str] = None
    confidence: Optional[float] = None

class PredictionsResponse(BaseModel):
    predictions: List[Prediction]
    nextCursor: Optional[str] = None
    hasMore: bool = False
    total: Optional[int] = None

class SentimentData(BaseModel):
    symbol: str
    score: float  # -1..1
    window: str
    timestamp: str
    sources: Optional[List[str]] = None

class SentimentResponse(BaseModel):
    sentiment: List[SentimentData]
    nextCursor: Optional[str] = None
    hasMore: bool = False
    total: Optional[int] = None

# Helper functions to load fixture data
def load_fixture(filename: str) -> List[dict]:
    """Load fixture data - embedded for Docker compatibility."""
    if filename == 'predictions.json':
        return [
            {
                "id": "pred_001",
                "symbol": "AAPL",
                "time": "2025-09-28T14:30:00Z",
                "values": [175.25, 176.10, 177.80, 179.20, 180.15],
                "horizon": 5,
                "model": "N-BEATS",
                "confidence": 0.87
            },
            {
                "id": "pred_002", 
                "symbol": "MSFT",
                "time": "2025-09-28T14:30:00Z",
                "values": [331.45, 332.80, 334.20, 335.90, 337.25],
                "horizon": 5,
                "model": "LSTM",
                "confidence": 0.82
            },
            {
                "id": "pred_003",
                "symbol": "GOOGL", 
                "time": "2025-09-28T14:30:00Z",
                "values": [139.80, 140.50, 141.25, 142.10, 143.00],
                "horizon": 5,
                "model": "N-BEATS",
                "confidence": 0.91
            }
        ]
    elif filename == 'sentiment.json':
        return [
            {
                "symbol": "AAPL",
                "score": 0.65,
                "window": "1h",
                "timestamp": "2025-09-28T14:30:00Z",
                "sources": ["Reuters", "Bloomberg", "WSJ"]
            },
            {
                "symbol": "MSFT", 
                "score": -0.12,
                "window": "1h",
                "timestamp": "2025-09-28T14:30:00Z",
                "sources": ["CNBC", "Financial Times"]
            },
            {
                "symbol": "GOOGL",
                "score": 0.38,
                "window": "1h", 
                "timestamp": "2025-09-28T14:30:00Z",
                "sources": ["Bloomberg", "MarketWatch"]
            }
        ]
    return []

def generate_realtime_predictions() -> List[dict]:
    """Generate some real-time prediction data for demo purposes."""
    symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "META"]
    models = ["N-BEATS", "LSTM", "Transformer"]
    
    predictions = []
    for i, symbol in enumerate(symbols):
        base_price = 100 + (i * 50)  # Vary base prices
        values = [base_price + (j * 2.5) for j in range(5)]  # 5-period forecast
        
        predictions.append({
            "id": f"rt_pred_{i}",
            "symbol": symbol,
            "time": datetime.utcnow().isoformat() + "Z",
            "values": values,
            "horizon": 5,
            "model": models[i % len(models)],
            "confidence": 0.7 + (i * 0.05)  # Vary confidence
        })
    
    return predictions

def generate_realtime_sentiment() -> List[dict]:
    """Generate some real-time sentiment data for demo purposes."""
    symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "META", "AMZN", "AMD"]
    sources_options = [
        ["Reuters", "Bloomberg"], 
        ["CNBC", "WSJ"], 
        ["Financial Times", "MarketWatch"],
        ["Bloomberg", "Reuters", "WSJ"]
    ]
    
    sentiment_data = []
    for i, symbol in enumerate(symbols):
        # Generate sentiment between -0.8 and 0.8
        score = (i - 4) * 0.2 + (0.1 if i % 2 else -0.1)
        score = max(-0.8, min(0.8, score))  # Clamp to reasonable range
        
        sentiment_data.append({
            "symbol": symbol,
            "score": score,
            "window": "1h",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sources": sources_options[i % len(sources_options)]
        })
    
    return sentiment_data

# API Endpoints
@api_router.get("/predictions", response_model=PredictionsResponse)
async def get_predictions(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    model: Optional[str] = Query(None, description="Filter by model type"),
    since: Optional[str] = Query(None, description="Filter predictions since timestamp"),
    horizon: Optional[int] = Query(None, description="Filter by forecast horizon"),
    limit: int = Query(20, ge=1, le=100, description="Number of predictions to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor")
):
    """
    Get model predictions with optional filtering and pagination.
    """
    try:
        # Try to load fixture data first, then supplement with real-time data
        fixture_data = load_fixture('predictions.json')
        realtime_data = generate_realtime_predictions()
        
        # Combine fixture and real-time data
        all_predictions = fixture_data + realtime_data
        
        # Apply filters
        filtered_predictions = all_predictions.copy()
        
        if symbol:
            filtered_predictions = [p for p in filtered_predictions if p.get('symbol') == symbol]
        
        if model:
            filtered_predictions = [p for p in filtered_predictions if p.get('model') == model]
        
        if since:
            # Simple timestamp filtering (in production, use proper datetime parsing)
            filtered_predictions = [p for p in filtered_predictions if p.get('time', '') >= since]
        
        if horizon:
            filtered_predictions = [p for p in filtered_predictions if p.get('horizon') == horizon]
        
        # Simple pagination (in production, implement proper cursor-based pagination)
        start_idx = 0
        if cursor:
            try:
                start_idx = int(cursor)
            except ValueError:
                pass
        
        end_idx = start_idx + limit
        page_predictions = filtered_predictions[start_idx:end_idx]
        has_more = end_idx < len(filtered_predictions)
        next_cursor = str(end_idx) if has_more else None
        
        # Convert to Pydantic models
        predictions = [Prediction(**pred) for pred in page_predictions]
        
        return PredictionsResponse(
            predictions=predictions,
            nextCursor=next_cursor,
            hasMore=has_more,
            total=len(filtered_predictions)
        )
        
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch predictions")

@api_router.get("/predictions/{prediction_id}", response_model=Prediction)
async def get_prediction_by_id(prediction_id: str):
    """
    Get a specific prediction by ID.
    """
    try:
        fixture_data = load_fixture('predictions.json')
        realtime_data = generate_realtime_predictions()
        all_predictions = fixture_data + realtime_data
        
        prediction_data = next((p for p in all_predictions if p.get('id') == prediction_id), None)
        if not prediction_data:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        return Prediction(**prediction_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching prediction {prediction_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch prediction")

@api_router.get("/sentiment", response_model=SentimentResponse)
async def get_sentiment(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    window: Optional[str] = Query(None, description="Filter by time window (1h, 4h, 1d, 1w)"),
    sources: Optional[str] = Query(None, description="Filter by sources (comma-separated)"),
    since: Optional[str] = Query(None, description="Filter sentiment since timestamp"),
    limit: int = Query(20, ge=1, le=100, description="Number of sentiment entries to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor")
):
    """
    Get sentiment analysis data with optional filtering and pagination.
    """
    try:
        # Try to load fixture data first, then supplement with real-time data
        fixture_data = load_fixture('sentiment.json')
        realtime_data = generate_realtime_sentiment()
        
        # Combine fixture and real-time data, preferring fixture data
        all_sentiment = fixture_data + [rt for rt in realtime_data 
                                      if not any(f.get('symbol') == rt['symbol'] for f in fixture_data)]
        
        # Apply filters
        filtered_sentiment = all_sentiment.copy()
        
        if symbol:
            filtered_sentiment = [s for s in filtered_sentiment if s.get('symbol') == symbol]
        
        if window:
            filtered_sentiment = [s for s in filtered_sentiment if s.get('window') == window]
        
        if sources:
            source_list = [s.strip() for s in sources.split(',')]
            filtered_sentiment = [s for s in filtered_sentiment 
                                if s.get('sources') and any(src in s['sources'] for src in source_list)]
        
        if since:
            filtered_sentiment = [s for s in filtered_sentiment if s.get('timestamp', '') >= since]
        
        # Simple pagination
        start_idx = 0
        if cursor:
            try:
                start_idx = int(cursor)
            except ValueError:
                pass
        
        end_idx = start_idx + limit
        page_sentiment = filtered_sentiment[start_idx:end_idx]
        has_more = end_idx < len(filtered_sentiment)
        next_cursor = str(end_idx) if has_more else None
        
        # Convert to Pydantic models
        sentiment_data = [SentimentData(**sent) for sent in page_sentiment]
        
        return SentimentResponse(
            sentiment=sentiment_data,
            nextCursor=next_cursor,
            hasMore=has_more,
            total=len(filtered_sentiment)
        )
        
    except Exception as e:
        logger.error(f"Error fetching sentiment: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sentiment data")

@api_router.get("/sentiment/{symbol}", response_model=List[SentimentData])
async def get_sentiment_by_symbol(symbol: str):
    """
    Get sentiment data for a specific symbol.
    """
    try:
        fixture_data = load_fixture('sentiment.json')
        realtime_data = generate_realtime_sentiment()
        all_sentiment = fixture_data + realtime_data
        
        symbol_sentiment = [s for s in all_sentiment if s.get('symbol') == symbol]
        
        if not symbol_sentiment:
            raise HTTPException(status_code=404, detail=f"No sentiment data found for symbol {symbol}")
        
        return [SentimentData(**sent) for sent in symbol_sentiment]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sentiment for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sentiment data")