"""
ML Client for Strategy Engine

Provides HTTP clients for connecting to ONNX Runner, TensorRT Runner, and Sentiment Engine
to incorporate ML predictions and sentiment analysis into trading decisions.
"""
import httpx
import asyncio
import logging
from typing import Dict, List, Optional, Tuple
import json

logger = logging.getLogger(__name__)

class ONNXClient:
    """Client for ONNX Runner service (CPU-based model inference)"""
    
    def __init__(self, base_url: str = "http://onnx_runner:8001"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=3.0)
        self.model_cache = {}
        
    async def get_forecast(self, symbol: str, history: List[float], horizon: int = 10) -> Dict:
        """Get N-BEATS price forecast for symbol"""
        try:
            payload = {
                "symbol": symbol,
                "history": history[-60:],  # Use last 60 data points
                "horizon": horizon
            }
            
            response = await self.client.post(
                f"{self.base_url}/infer/forecast/nbeats",
                json=payload,
                timeout=2.0
            )
            response.raise_for_status()
            
            result = response.json()
            logger.debug(f"ONNX forecast for {symbol}: {result.get('forecast', [0.0])[:3]}...")
            return result
            
        except httpx.TimeoutException:
            logger.warning(f"ONNX forecast timeout for {symbol}")
            return {"forecast": [0.0] * horizon, "confidence": [0.0] * horizon, "meta": {"error": "timeout"}}
        except Exception as e:
            logger.error(f"ONNX forecast failed for {symbol}: {e}")
            return {"forecast": [0.0] * horizon, "confidence": [0.0] * horizon, "meta": {"error": str(e)}}
    
    async def get_pattern_classification(self, symbol: str, features: List[float]) -> Dict:
        """Get pattern classification from CNN model"""
        try:
            payload = {
                "symbol": symbol,
                "features": features,
                "model": "cnn_pattern"
            }
            
            response = await self.client.post(
                f"{self.base_url}/infer/classify",
                json=payload,
                timeout=1.5
            )
            response.raise_for_status()
            
            result = response.json()
            return result
            
        except Exception as e:
            logger.error(f"Pattern classification failed for {symbol}: {e}")
            return {"classification": "neutral", "confidence": 0.0, "error": str(e)}
    
    async def health_check(self) -> bool:
        """Check if ONNX Runner is healthy"""
        try:
            response = await self.client.get(f"{self.base_url}/health", timeout=1.0)
            return response.status_code == 200
        except Exception:
            return False
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class TensorRTClient:
    """Client for TensorRT Runner service (GPU-accelerated inference)"""
    
    def __init__(self, base_url: str = "http://tensorrt_runner:8007"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=2.0)
        self.available = None  # Cache availability status
        
    async def get_forecast(self, symbol: str, history: List[float], horizon: int = 10) -> Dict:
        """Get GPU-accelerated forecast (parallel to ONNX)"""
        if not await self.is_available():
            return {"forecast": [], "confidence": [], "meta": {"error": "tensorrt_unavailable"}}
            
        try:
            payload = {
                "symbol": symbol,
                "history": history[-60:],
                "horizon": horizon,
                "engine": "nbeats_trt"
            }
            
            response = await self.client.post(
                f"{self.base_url}/infer/forecast",
                json=payload,
                timeout=1.5  # Shorter timeout since it should be faster
            )
            response.raise_for_status()
            
            result = response.json()
            logger.debug(f"TensorRT forecast for {symbol}: {result.get('forecast', [0.0])[:3]}...")
            return result
            
        except Exception as e:
            logger.warning(f"TensorRT forecast failed for {symbol}: {e}")
            return {"forecast": [], "confidence": [], "meta": {"error": str(e)}}
    
    async def is_available(self) -> bool:
        """Check if TensorRT Runner is available (cache result)"""
        if self.available is None:
            try:
                response = await self.client.get(f"{self.base_url}/health", timeout=1.0)
                self.available = response.status_code == 200
            except Exception:
                self.available = False
        return self.available
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class SentimentClient:
    """Client for Sentiment Engine service"""
    
    def __init__(self, base_url: str = "http://sentiment_engine:8002"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=2.0)
        self.sentiment_cache = {}  # Cache recent sentiment scores
        
    async def get_symbol_sentiment(self, symbol: str, window: str = "1h") -> float:
        """Get aggregated sentiment score for symbol (-1 to 1)"""
        cache_key = f"{symbol}_{window}"
        
        # Check cache first (sentiment doesn't change rapidly)
        if cache_key in self.sentiment_cache:
            cached_time, sentiment = self.sentiment_cache[cache_key]
            if asyncio.get_event_loop().time() - cached_time < 300:  # 5 minute cache
                return sentiment
        
        try:
            response = await self.client.get(
                f"{self.base_url}/api/sentiment",
                params={"symbol": symbol, "window": window},
                timeout=1.5
            )
            response.raise_for_status()
            
            data = response.json()
            sentiment_score = data.get("sentiment_score", 0.0)
            
            # Cache the result
            self.sentiment_cache[cache_key] = (asyncio.get_event_loop().time(), sentiment_score)
            
            logger.debug(f"Sentiment for {symbol}: {sentiment_score:.3f}")
            return sentiment_score
            
        except Exception as e:
            logger.error(f"Sentiment lookup failed for {symbol}: {e}")
            return 0.0  # Neutral sentiment on error
    
    async def analyze_text(self, text: str, source: Optional[str] = None) -> Dict:
        """Analyze text sentiment directly"""
        try:
            payload = {"text": text[:1000], "source": source}  # Limit text length
            
            response = await self.client.post(
                f"{self.base_url}/api/analyze",
                json=payload,
                timeout=2.0
            )
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Text sentiment analysis failed: {e}")
            return {"sentiment_score": 0.0, "authenticity_score": 0.5, "error": str(e)}
    
    async def health_check(self) -> bool:
        """Check if Sentiment Engine is healthy"""
        try:
            response = await self.client.get(f"{self.base_url}/health", timeout=1.0)
            return response.status_code == 200
        except Exception:
            return False
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class MLServiceManager:
    """Manages all ML service clients with health monitoring"""
    
    def __init__(self):
        self.onnx_client = ONNXClient()
        self.tensorrt_client = TensorRTClient()
        self.sentiment_client = SentimentClient()
        
        self.health_status = {
            "onnx_runner": False,
            "tensorrt_runner": False,
            "sentiment_engine": False
        }
        
        self.last_health_check = 0
        self.health_check_interval = 30  # 30 seconds
    
    async def get_dual_forecast(self, symbol: str, history: List[float], horizon: int = 10) -> Dict:
        """
        Get forecast from both ONNX and TensorRT in parallel, use fastest response.
        Implements the dual-path inference strategy from architecture.
        """
        if not history or len(history) < 10:
            return {"forecast": [0.0] * horizon, "confidence": [0.0] * horizon, "source": "insufficient_data"}
        
        # Start both requests in parallel
        tasks = [
            asyncio.create_task(self.onnx_client.get_forecast(symbol, history, horizon)),
            asyncio.create_task(self.tensorrt_client.get_forecast(symbol, history, horizon))
        ]
        
        try:
            # Wait for first successful completion
            done, pending = await asyncio.wait(
                tasks, 
                return_when=asyncio.FIRST_COMPLETED,
                timeout=3.0
            )
            
            # Cancel remaining tasks
            for task in pending:
                task.cancel()
            
            # Get the first result
            if done:
                result = done.pop().result()
                # Add source information
                if result.get("forecast") and len(result["forecast"]) > 0:
                    result["source"] = "ml_service"
                    return result
        
        except asyncio.TimeoutError:
            logger.warning(f"Both ML services timed out for {symbol}")
        except Exception as e:
            logger.error(f"Dual forecast failed for {symbol}: {e}")
        
        # Fallback to zero forecast
        return {"forecast": [0.0] * horizon, "confidence": [0.0] * horizon, "source": "fallback"}
    
    async def get_enhanced_analysis(self, symbol: str, history: List[float]) -> Dict:
        """Get comprehensive analysis combining forecast and sentiment"""
        try:
            # Run forecast and sentiment analysis in parallel
            forecast_task = self.get_dual_forecast(symbol, history)
            sentiment_task = self.sentiment_client.get_symbol_sentiment(symbol)
            
            results = await asyncio.wait_for(
                asyncio.gather(forecast_task, sentiment_task),
                timeout=4.0
            )
            forecast, sentiment = results
            
            # Combine results
            analysis = {
                "symbol": symbol,
                "forecast": forecast.get("forecast", [0.0])[0] if forecast.get("forecast") else 0.0,
                "forecast_confidence": forecast.get("confidence", [0.0])[0] if forecast.get("confidence") else 0.0,
                "sentiment": sentiment,
                "forecast_source": forecast.get("source", "unknown"),
                "timestamp": asyncio.get_event_loop().time()
            }
            
            # Calculate combined confidence
            forecast_conf = analysis["forecast_confidence"]
            sentiment_conf = min(abs(sentiment) * 2, 1.0)  # Convert sentiment to confidence
            analysis["combined_confidence"] = (forecast_conf + sentiment_conf) / 2
            
            return analysis
            
        except Exception as e:
            logger.error(f"Enhanced analysis failed for {symbol}: {e}")
            return {
                "symbol": symbol,
                "forecast": 0.0,
                "forecast_confidence": 0.0,
                "sentiment": 0.0,
                "combined_confidence": 0.0,
                "error": str(e)
            }
    
    async def check_all_health(self) -> Dict[str, bool]:
        """Check health of all ML services"""
        current_time = asyncio.get_event_loop().time()
        
        # Only check if enough time has passed
        if current_time - self.last_health_check < self.health_check_interval:
            return self.health_status
        
        try:
            # Check all services in parallel
            results = await asyncio.wait_for(
                asyncio.gather(
                    self.onnx_client.health_check(),
                    self.tensorrt_client.is_available(),
                    self.sentiment_client.health_check()
                ),
                timeout=3.0
            )
            onnx_health, tensorrt_health, sentiment_health = results
            
            self.health_status = {
                "onnx_runner": onnx_health,
                "tensorrt_runner": tensorrt_health,
                "sentiment_engine": sentiment_health
            }
            
            self.last_health_check = current_time
            
            logger.info(f"ML Service health: ONNX={onnx_health}, TRT={tensorrt_health}, Sentiment={sentiment_health}")
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
        
        return self.health_status
    
    async def close(self):
        """Close all HTTP clients"""
        await asyncio.gather(
            self.onnx_client.close(),
            self.tensorrt_client.close(),
            self.sentiment_client.close(),
            return_exceptions=True
        )