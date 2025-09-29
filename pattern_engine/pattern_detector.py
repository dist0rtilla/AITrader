#!/usr/bin/env python3
"""
Pattern Engine Service - Signal Detection and Publishing

This service runs the pattern detection algorithm on streaming market data
and publishes trading signals to Redis streams for consumption by the Strategy Engine.
"""
import asyncio
import redis
import json
import logging
import os
import time
from typing import Dict, Optional
from pattern_engine.runner import run_replay, default_model_stub
from pattern_engine.state import EMA, VWAP, Welford
from pattern_engine.config import cfg

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Streams and Redis URL come from config
REDIS_URL = cfg.redis_url
SIGNALS_STREAM = cfg.signals_stream
TICKS_STREAM = cfg.ticks_stream


def _xadd_with_retry(client, stream: str, data: dict):
    """Attempt xadd with a small retry/backoff loop to tolerate transient errors."""
    last_exc = None
    for attempt in range(1, cfg.redis_max_retries + 1):
        try:
            return client.xadd(stream, data)
        except Exception as e:
            last_exc = e
            logger.warning("xadd attempt %d/%d failed for stream %s: %s", attempt, cfg.redis_max_retries, stream, e)
            time.sleep(cfg.redis_retry_delay_seconds)
    # last attempt failed
    logger.error("xadd failed after %d attempts for stream %s: %s", cfg.redis_max_retries, stream, last_exc)
    raise last_exc

class PatternDetector:
    def __init__(self):
        self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        self.symbol_states: Dict[str, 'SymbolState'] = {}
        
    class SymbolState:
        def __init__(self, symbol: str):
            self.symbol = symbol
            self.ema_fast = EMA(0.1)      # 10-period equivalent
            self.ema_slow = EMA(0.05)     # 20-period equivalent
            self.vwap = VWAP()
            self.welford = Welford()
            self.last_signal_time = 0
            self.signal_cooldown = cfg.signal_cooldown_seconds
            # adaptive average volume via EMA
            self.avg_volume_ema = EMA(cfg.volume_ema_alpha)
            
        def update_and_detect(self, price: float, volume: float, timestamp: float) -> Optional[dict]:
            """Update indicators and detect patterns"""
            # Update all indicators
            ema_fast = self.ema_fast.update(price)
            ema_slow = self.ema_slow.update(price)
            vwap_price = self.vwap.update(price, volume)
            self.welford.update(price)
            
            # Pattern detection logic
            signal_score = 0.0
            pattern_type = None
            
            # EMA Crossover Pattern
            if ema_fast and ema_slow:
                ema_diff = (ema_fast - ema_slow) / ema_slow
                if abs(ema_diff) > 0.01:  # 1% difference threshold
                    signal_score += ema_diff * 2.0  # Amplify signal
                    pattern_type = "ema_crossover"
            
            # VWAP Deviation Pattern
            if vwap_price:
                vwap_diff = (price - vwap_price) / vwap_price
                if abs(vwap_diff) > 0.005:  # 0.5% deviation threshold
                    signal_score += vwap_diff * 1.5
                    if not pattern_type:
                        pattern_type = "vwap_deviation"
            
            # Volume Spike Pattern (adaptive average via EMA)
            if volume > 0:
                # update EMA of volume to maintain running average
                avg_volume = self.avg_volume_ema.update(volume)
                # protect against zero
                if avg_volume is None or avg_volume == 0:
                    avg_volume = float(volume)
                volume_ratio = volume / avg_volume
                if volume_ratio > cfg.volume_spike_multiplier:
                    signal_score += 0.3 if signal_score > 0 else -0.3
                    pattern_type = "volume_spike"
            
            # Volatility Pattern
            if self.welford.count > 5:
                volatility = self.welford.std
                price_change = abs(price - (ema_fast or price)) / price
                if price_change > volatility * 2:  # 2 standard deviations
                    signal_score += 0.4 if signal_score > 0 else -0.4
                    pattern_type = "volatility_breakout"
            
            # Normalize signal score to [-1, 1]
            signal_score = max(-1.0, min(1.0, signal_score))
            
            # Only generate signal if significant and not in cooldown
            if (abs(signal_score) > cfg.signal_score_min and 
                timestamp - self.last_signal_time > self.signal_cooldown):
                
                self.last_signal_time = timestamp
                
                return {
                    "id": f"{self.symbol}_{int(timestamp)}",
                    "symbol": self.symbol,
                    "score": signal_score,
                    "pattern": pattern_type or "composite",
                    "timestamp": timestamp,
                    "meta": {
                        "ema_fast": ema_fast,
                        "ema_slow": ema_slow,
                        "vwap": vwap_price,
                        "volume": volume,
                        "volatility": self.welford.std if self.welford.count > 1 else 0.0
                    }
                }
            
            return None
    
    async def process_tick_stream(self):
        """Process incoming tick data and generate signals"""
        logger.info("Starting pattern detection on tick stream")
        
        # In production, this would subscribe to real tick data
        # For now, we'll generate some mock tick data for testing
        await self.generate_mock_ticks()
    
    async def generate_mock_ticks(self):
        """Generate mock tick data for testing (replace with real feed)"""
        import random
        
        symbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]
        base_prices = {"AAPL": 150.0, "GOOGL": 2800.0, "MSFT": 380.0, "TSLA": 250.0, "AMZN": 3400.0}
        
        logger.info("Generating mock tick data for pattern detection")
        
        tick_count = 0
        while True:
            for symbol in symbols:
                # Generate realistic price movement
                base_price = base_prices[symbol]
                price_change = random.gauss(0, base_price * 0.001)  # 0.1% volatility
                new_price = base_price + price_change
                base_prices[symbol] = new_price
                
                volume = random.randint(100, 5000)
                timestamp = time.time()
                
                # Update pattern detection
                if symbol not in self.symbol_states:
                    self.symbol_states[symbol] = self.SymbolState(symbol)
                
                signal = self.symbol_states[symbol].update_and_detect(
                    new_price, volume, timestamp
                )
                
                # Publish tick data
                tick_data = {
                    "symbol": symbol,
                    "price": new_price,
                    "volume": volume,
                    "timestamp": timestamp
                }
                
                try:
                    self.redis_client.xadd(TICKS_STREAM, tick_data)
                except Exception as e:
                    logger.error(f"Failed to publish tick: {e}")
                
                # Publish signal if detected
                if signal:
                    try:
                        self.redis_client.xadd(SIGNALS_STREAM, signal)
                        logger.info(f"Signal generated: {symbol} score={signal['score']:.3f} pattern={signal['pattern']}")
                    except Exception as e:
                        logger.error(f"Failed to publish signal: {e}")
                
                tick_count += 1
                if tick_count % 100 == 0:
                    logger.info(f"Processed {tick_count} ticks, {len(self.symbol_states)} symbols active")
            
            # Wait before next tick batch
            await asyncio.sleep(1.0)  # 1 second between batches
    
    async def health_check_server(self):
        """Simple health check endpoint"""
        from aiohttp import web
        
        async def health_handler(request):
            status = {
                "status": "healthy",
                "active_symbols": len(self.symbol_states),
                "signals_stream": SIGNALS_STREAM,
                "ticks_stream": TICKS_STREAM,
                "timestamp": time.time()
            }
            return web.json_response(status)
        
        app = web.Application()
        app.router.add_get('/health', health_handler)
        
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '0.0.0.0', 8005)
        await site.start()
        logger.info("Health check server started on port 8005")

async def main():
    """Main service entry point"""
    logger.info("Starting Pattern Engine Service")
    
    detector = PatternDetector()
    
    # Start health check server and pattern detection
    await asyncio.gather(
        detector.health_check_server(),
        detector.process_tick_stream()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Pattern Engine Service stopped")
    except Exception as e:
        logger.error(f"Pattern Engine Service failed: {e}")
        raise