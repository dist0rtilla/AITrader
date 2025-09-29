"""
Enhanced Strategy Engine Service

Integrates ML predictions and sentiment analysis into trading decisions.
Connects to ONNX Runner, Sentiment Engine, and Mock MCP for comprehensive analysis.
"""
import asyncio
import redis
import os
import json
import uuid
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from strategy_engine.calculator import get_calculator
from strategy_engine.ml_client import MLServiceManager
from backend.core.db import SessionLocal
from backend.models import Execution, Leaderboard, Reward

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
MCP_URL = os.environ.get('MCP_URL', 'http://mock-mcp:9000/mcp')
SIGNALS_STREAM = 'signals:global'
ORDERS_STREAM = 'orders:gateway'
FILLS_STREAM = 'fills:global'
TICKS_STREAM = 'ticks:global'

# Trading parameters
REWARD_SCALE = float(os.environ.get('REWARD_SCALE', '1.0'))
LOSS_MULTIPLIER = float(os.environ.get('LOSS_MULTIPLIER', '3.0'))
MIN_SIGNAL_THRESHOLD = float(os.environ.get('MIN_SIGNAL_THRESHOLD', '0.3'))
MAX_POSITION_SIZE = int(os.environ.get('MAX_POSITION_SIZE', '1000'))

class EnhancedStrategyEngine:
    """Enhanced Strategy Engine with ML integration"""
    
    def __init__(self):
        self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        self.calculator = get_calculator()
        self.ml_manager = MLServiceManager()
        
        # Consumer group for Redis streams
        self.consumer_group = "strategy_consumers"
        self.consumer_name = f"strategy_{os.getpid()}"
        
        # Price history storage for ML predictions
        self.price_history: Dict[str, List[float]] = {}
        self.max_history_length = 100
        
        # Performance tracking
        self.stats = {
            "signals_processed": 0,
            "orders_placed": 0,
            "ml_predictions_used": 0,
            "sentiment_analyses": 0,
            "errors": 0
        }
        
    async def initialize(self):
        """Initialize Redis consumer groups and ML services"""
        try:
            # Create consumer groups
            for stream in [SIGNALS_STREAM, FILLS_STREAM, TICKS_STREAM]:
                try:
                    self.redis_client.xgroup_create(stream, self.consumer_group, id='0', mkstream=True)
                    logger.info(f"Created consumer group {self.consumer_group} for {stream}")
                except redis.exceptions.ResponseError as e:
                    if "BUSYGROUP" not in str(e):
                        logger.error(f"Failed to create consumer group for {stream}: {e}")
            
            # Check ML service health
            health_status = await self.ml_manager.check_all_health()
            logger.info(f"ML Services health check: {health_status}")
            
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            raise
    
    async def update_price_history(self, symbol: str, price: float):
        """Maintain price history for ML predictions"""
        if symbol not in self.price_history:
            self.price_history[symbol] = []
        
        self.price_history[symbol].append(price)
        
        # Keep only recent history
        if len(self.price_history[symbol]) > self.max_history_length:
            self.price_history[symbol] = self.price_history[symbol][-self.max_history_length:]
    
    async def enhanced_decide_and_order(self, signal: Dict[str, Any]) -> Optional[Dict]:
        """
        Enhanced decision making incorporating:
        1. Technical indicators (existing)
        2. ML price predictions (new)
        3. Sentiment analysis (new)
        4. Risk management (enhanced)
        """
        try:
            symbol = signal.get('symbol')
            if not symbol or not isinstance(symbol, str):
                logger.warning(f"Invalid symbol in signal: {symbol}")
                return None
                
            signal_score = float(signal.get('score', 0.0))
            
            # Skip weak signals
            if abs(signal_score) < MIN_SIGNAL_THRESHOLD:
                logger.debug(f"Skipping weak signal for {symbol}: score={signal_score:.3f}")
                return None
            
            # Get technical indicators
            sma20 = self.calculator.sma(symbol, 20) or 0.0
            rsi14 = self.calculator.rsi(symbol, 14) or 50.0
            atr14 = self.calculator.atr(symbol, 14) or 1.0
            
            # Get current price for history
            current_price = signal.get('meta', {}).get('price', 0.0)
            if current_price > 0:
                await self.update_price_history(symbol, current_price)
            
            # Get ML analysis (forecast + sentiment)
            history = self.price_history.get(symbol, [])
            if len(history) >= 10:
                ml_analysis = await self.ml_manager.get_enhanced_analysis(symbol, history)
                self.stats["ml_predictions_used"] += 1
                self.stats["sentiment_analyses"] += 1
            else:
                logger.debug(f"Insufficient price history for {symbol}: {len(history)} points")
                ml_analysis = {
                    "forecast": 0.0,
                    "forecast_confidence": 0.0,
                    "sentiment": 0.0,
                    "combined_confidence": 0.0
                }
            
            # Multi-factor decision algorithm
            factors = await self.calculate_decision_factors(
                signal, sma20, rsi14, atr14, ml_analysis
            )
            
            # Combined scoring
            combined_score = self.calculate_combined_score(factors)
            
            # Position sizing
            position_size = self.calculate_position_size(
                combined_score, factors, atr14, current_price
            )
            
            # Trading decision
            if combined_score > 0.4:  # Bullish threshold
                side = "BUY"
            elif combined_score < -0.4:  # Bearish threshold
                side = "SELL"
            else:
                logger.debug(f"No trade for {symbol}: combined_score={combined_score:.3f}")
                return None
            
            # Create order
            order = await self.create_order(
                symbol, side, position_size, combined_score, factors
            )
            
            # Log decision
            logger.info(
                f"Enhanced order for {symbol}: {side} {position_size} shares "
                f"(score={combined_score:.3f}, forecast={ml_analysis['forecast']:.3f}, "
                f"sentiment={ml_analysis['sentiment']:.3f})"
            )
            
            self.stats["orders_placed"] += 1
            return order
            
        except Exception as e:
            logger.error(f"Decision making failed for {signal}: {e}")
            self.stats["errors"] += 1
            return None
    
    async def calculate_decision_factors(
        self, signal: Dict, sma20: float, rsi14: float, atr14: float, ml_analysis: Dict
    ) -> Dict[str, float]:
        """Calculate all decision factors"""
        symbol = signal.get('symbol', '')
        return {
            "signal_score": float(signal.get('score', 0.0)),
            "forecast": ml_analysis.get('forecast', 0.0),
            "forecast_confidence": ml_analysis.get('forecast_confidence', 0.0),
            "sentiment": ml_analysis.get('sentiment', 0.0),
            "sma_trend": self.calculate_sma_trend(symbol, sma20),
            "rsi_filter": self.calculate_rsi_filter(rsi14),
            "volatility": atr14,
            "pattern_strength": float(signal.get('meta', {}).get('volume', 1000)) / 1000.0,
            "ml_confidence": ml_analysis.get('combined_confidence', 0.0)
        }
    
    def calculate_sma_trend(self, symbol: str, sma20: float) -> float:
        """Calculate SMA trend factor"""
        if not sma20:
            return 0.0
        
        history = self.price_history.get(symbol, [])
        if len(history) < 2:
            return 0.0
        
        current_price = history[-1]
        price_to_sma = (current_price - sma20) / sma20
        
        # Normalize to [-1, 1]
        return max(-1.0, min(1.0, price_to_sma * 10))
    
    def calculate_rsi_filter(self, rsi14: float) -> float:
        """Calculate RSI-based filter"""
        if not rsi14:
            return 0.0
        
        if rsi14 > 70:  # Overbought
            return -0.5
        elif rsi14 < 30:  # Oversold
            return 0.5
        else:
            return 0.0
    
    def calculate_combined_score(self, factors: Dict[str, float]) -> float:
        """Calculate combined decision score using weighted factors"""
        weights = {
            "signal_score": 0.25,      # Original pattern signal
            "forecast": 0.20,          # ML price prediction
            "forecast_confidence": 0.15, # ML confidence multiplier  
            "sentiment": 0.15,         # Market sentiment
            "sma_trend": 0.10,         # Technical trend
            "rsi_filter": 0.05,        # Momentum filter
            "pattern_strength": 0.05,  # Pattern quality
            "ml_confidence": 0.05      # Overall ML confidence
        }
        
        combined = 0.0
        for factor, weight in weights.items():
            factor_value = factors.get(factor, 0.0)
            combined += factor_value * weight
        
        # Apply ML confidence as multiplier
        ml_confidence = factors.get('ml_confidence', 0.5)
        combined *= (0.5 + ml_confidence * 0.5)  # Scale by 0.5 to 1.0
        
        # Normalize to [-1, 1]
        return max(-1.0, min(1.0, combined))
    
    def calculate_position_size(
        self, combined_score: float, factors: Dict, atr14: float, current_price: float
    ) -> int:
        """Calculate position size based on risk and confidence"""
        base_size = 100  # Base position size
        
        # Confidence adjustment
        confidence = min(abs(combined_score), factors.get('ml_confidence', 0.5))
        confidence_multiplier = 0.5 + confidence * 1.5  # 0.5x to 2.0x
        
        # Volatility adjustment (reduce size for high volatility)
        volatility_adj = 1.0 / (1.0 + atr14 / current_price if current_price > 0 else 1.0)
        
        # Calculate final size
        position_size = int(base_size * confidence_multiplier * volatility_adj)
        
        # Apply limits
        return max(1, min(position_size, MAX_POSITION_SIZE))
    
    async def create_order(
        self, symbol: str, side: str, quantity: int, combined_score: float, factors: Dict
    ) -> Dict:
        """Create and persist order with enhanced metadata"""
        order_id = str(uuid.uuid4())
        
        order = {
            "id": order_id,
            "symbol": symbol,
            "side": side,
            "qty": quantity,
            "type": "MARKET",
            "strategy": "enhanced_ml_sentiment",
            "combined_score": combined_score,
            "timestamp": datetime.utcnow().isoformat(),
            "factors": factors
        }
        
        # Persist to database
        try:
            db = SessionLocal()
            execution = Execution(
                id=order_id,
                strategy_id="enhanced_strategy",
                symbol=symbol,
                side=side,
                qty=float(quantity),
                price=None,  # Will be filled on execution
                status='pending',
                reason='ml_enhanced_signal',
                context={
                    "combined_score": combined_score,
                    "factors": factors,
                    "strategy_version": "2.0"
                }
            )
            db.add(execution)
            db.commit()
            logger.info(f"Persisted execution record {order_id}")
            
        except Exception as e:
            logger.error(f"Failed to persist execution {order_id}: {e}")
        finally:
            try:
                db.close()
            except:
                pass
        
        return order
    
    async def publish_order(self, order: Dict):
        """Publish order to execution engine"""
        try:
            self.redis_client.xadd(ORDERS_STREAM, order)
            logger.info(f"Published order {order['id']} for {order['symbol']}")
            
            # Update leaderboard
            self.increment_leaderboard("enhanced_strategy", "orders_placed", 1)
            
        except Exception as e:
            logger.error(f"Failed to publish order {order.get('id')}: {e}")
            
            # Update execution status
            try:
                db = SessionLocal()
                execution = db.query(Execution).get(order['id'])
                if execution:
                    execution.status = 'publish_failed'
                    db.commit()
            except Exception as db_error:
                logger.error(f"Failed to update execution status: {db_error}")
            finally:
                try:
                    db.close()
                except:
                    pass
    
    def increment_leaderboard(self, strategy_id: str, field: str, delta: int = 1):
        """Update leaderboard statistics"""
        try:
            db = SessionLocal()
            leaderboard = db.query(Leaderboard).filter(
                Leaderboard.strategy_id == strategy_id
            ).first()
            
            if not leaderboard:
                leaderboard = Leaderboard(
                    id=str(uuid.uuid4()),
                    strategy_id=strategy_id,
                    strategy_name="Enhanced ML Strategy"
                )
                db.add(leaderboard)
            
            if hasattr(leaderboard, field):
                current_value = getattr(leaderboard, field) or 0
                setattr(leaderboard, field, current_value + delta)
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Leaderboard update failed: {e}")
        finally:
            try:
                db.close()
            except:
                pass
    
    async def process_signals_stream(self):
        """Process incoming signals from pattern engine"""
        logger.info(f"Starting signal processing from {SIGNALS_STREAM}")
        
        while True:
            try:
                # Read from signals stream
                messages = self.redis_client.xreadgroup(
                    self.consumer_group,
                    self.consumer_name,
                    {SIGNALS_STREAM: '>'},
                    count=10,
                    block=1000  # 1 second timeout
                )
                
                for stream_name, msgs in messages:
                    for msg_id, fields in msgs:
                        try:
                            # Process signal
                            signal = dict(fields)
                            self.stats["signals_processed"] += 1
                            
                            # Enhanced decision making
                            order = await self.enhanced_decide_and_order(signal)
                            
                            if order:
                                await self.publish_order(order)
                            
                            # Acknowledge message
                            self.redis_client.xack(SIGNALS_STREAM, self.consumer_group, msg_id)
                            
                        except Exception as e:
                            logger.error(f"Error processing signal {msg_id}: {e}")
                            self.stats["errors"] += 1
                
                # Log stats periodically
                if self.stats["signals_processed"] % 50 == 0:
                    logger.info(f"Strategy stats: {self.stats}")
                    
            except Exception as e:
                logger.error(f"Signal stream processing error: {e}")
                await asyncio.sleep(5)  # Back off on errors
    
    async def process_fills_stream(self):
        """Process fill confirmations for P&L tracking"""
        logger.info(f"Starting fill processing from {FILLS_STREAM}")
        
        while True:
            try:
                messages = self.redis_client.xreadgroup(
                    self.consumer_group,
                    self.consumer_name,
                    {FILLS_STREAM: '>'},
                    count=5,
                    block=2000
                )
                
                for stream_name, msgs in messages:
                    for msg_id, fields in msgs:
                        try:
                            fill = dict(fields)
                            await self.process_fill(fill)
                            self.redis_client.xack(FILLS_STREAM, self.consumer_group, msg_id)
                            
                        except Exception as e:
                            logger.error(f"Error processing fill {msg_id}: {e}")
                            
            except Exception as e:
                logger.error(f"Fill stream processing error: {e}")
                await asyncio.sleep(5)
    
    async def process_fill(self, fill: Dict):
        """Process individual fill for P&L calculation"""
        try:
            order_id = fill.get('order_id')
            if not order_id:
                return
            
            # Update execution record
            db = SessionLocal()
            execution = db.query(Execution).get(order_id)
            if execution:
                execution.status = 'filled'
                execution.price = float(fill.get('price', 0.0))
                
                # Calculate P&L if we have entry price
                # (This would be enhanced with proper position tracking)
                
                db.commit()
                logger.info(f"Updated execution {order_id} with fill price {execution.price}")
            
        except Exception as e:
            logger.error(f"Fill processing failed: {e}")
        finally:
            try:
                db.close()
            except:
                pass
    
    async def health_check_server(self):
        """Health check endpoint"""
        from aiohttp import web
        
        async def health_handler(request):
            ml_health = await self.ml_manager.check_all_health()
            
            status = {
                "status": "healthy",
                "strategy_engine": "enhanced_ml_sentiment",
                "ml_services": ml_health,
                "statistics": self.stats,
                "active_symbols": len(self.price_history),
                "timestamp": datetime.utcnow().isoformat()
            }
            return web.json_response(status)
        
        app = web.Application()
        app.router.add_get('/health', health_handler)
        
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '0.0.0.0', 8005)
        await site.start()
        logger.info("Strategy Engine health server started on port 8005")
    
    async def run(self):
        """Main service loop"""
        logger.info("Starting Enhanced Strategy Engine")
        
        # Initialize
        await self.initialize()
        
        # Start all processing tasks
        await asyncio.gather(
            self.health_check_server(),
            self.process_signals_stream(),
            self.process_fills_stream()
        )
    
    async def shutdown(self):
        """Clean shutdown"""
        logger.info("Shutting down Enhanced Strategy Engine")
        await self.ml_manager.close()

async def main():
    """Service entry point"""
    engine = EnhancedStrategyEngine()
    
    try:
        await engine.run()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    except Exception as e:
        logger.error(f"Strategy Engine failed: {e}")
        raise
    finally:
        await engine.shutdown()

if __name__ == "__main__":
    asyncio.run(main())