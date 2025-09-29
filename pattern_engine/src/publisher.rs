//! Redis Streams publisher for pattern engine signals.
//!
//! Publishes trading signals and tick data to Redis streams for consumption
//! by the Strategy Engine and other services.

use redis::{Client, RedisResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{info};
use crate::patterns::PatternMeta;

/// Redis Streams publisher
pub struct Publisher {
    client: Client,
    signals_stream: String,
    ticks_stream: String,
}

impl Publisher {
    /// Create a new publisher with the given Redis URL
    pub fn new(redis_url: &str) -> RedisResult<Self> {
        let client = Client::open(redis_url)?;
        // Allow overriding stream names via environment for test-time isolation
        let signals = std::env::var("SIGNALS_STREAM").unwrap_or_else(|_| "signals:global".to_string());
        let ticks = std::env::var("TICKS_STREAM").unwrap_or_else(|_| "ticks:global".to_string());

        Ok(Self {
            client,
            signals_stream: signals,
            ticks_stream: ticks,
        })
    }

    /// Publish a trading signal to the signals stream
    pub async fn publish_signal(&self, signal: Signal) -> anyhow::Result<String> {
        let mut conn = self.client.get_async_connection().await?;
        let data = serde_json::to_string(&signal)?;
        let mut fields = HashMap::new();
        fields.insert("data".to_string(), data);

        let id: String = redis::cmd("XADD")
            .arg(&self.signals_stream)
            .arg("*")
            .arg(&fields)
            .query_async(&mut conn)
            .await?;

        info!("Published signal: {} score={:.3}", signal.symbol, signal.score);
        Ok(id)
    }

    /// Publish tick data to the ticks stream
    pub async fn publish_tick(&self, tick: Tick) -> anyhow::Result<String> {
        let mut conn = self.client.get_async_connection().await?;
        let data = serde_json::to_string(&tick)?;
        let mut fields = HashMap::new();
        fields.insert("data".to_string(), data);

        let id: String = redis::cmd("XADD")
            .arg(&self.ticks_stream)
            .arg("*")
            .arg(&fields)
            .query_async(&mut conn)
            .await?;

        Ok(id)
    }

    /// Get stream information for monitoring
    pub async fn get_stream_info(&self) -> anyhow::Result<StreamInfo> {
        let mut conn = self.client.get_async_connection().await?;
        let signals_len: usize = redis::cmd("XLEN")
            .arg(&self.signals_stream)
            .query_async(&mut conn)
            .await
            .unwrap_or(0);

        let ticks_len: usize = redis::cmd("XLEN")
            .arg(&self.ticks_stream)
            .query_async(&mut conn)
            .await
            .unwrap_or(0);

        Ok(StreamInfo {
            signals_stream: self.signals_stream.clone(),
            ticks_stream: self.ticks_stream.clone(),
            signals_length: signals_len,
            ticks_length: ticks_len,
        })
    }
}

/// Trading signal data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signal {
    pub id: String,
    pub symbol: String,
    pub score: f64,
    pub pattern: String,
    pub timestamp: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<SignalMeta>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern_meta: Option<PatternMeta>,
}

/// Additional metadata for trading signals
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalMeta {
    pub ema_fast: Option<f64>,
    pub ema_slow: Option<f64>,
    pub vwap: Option<f64>,
    pub volume: f64,
    pub volatility: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rsi: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub atr: Option<f64>,
}

/// Tick data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tick {
    pub symbol: String,
    pub price: f64,
    pub volume: f64,
    pub timestamp: f64,
}

/// Stream information for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamInfo {
    pub signals_stream: String,
    pub ticks_stream: String,
    pub signals_length: usize,
    pub ticks_length: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::patterns::PatternMeta;

    #[test]
    fn test_signal_serialization() {
        let signal = Signal {
            id: "AAPL_1234567890".to_string(),
            symbol: "AAPL".to_string(),
            score: 0.75,
            pattern: "ema_crossover".to_string(),
            timestamp: 1234567890.0,
            meta: Some(SignalMeta {
                ema_fast: Some(150.5),
                ema_slow: Some(149.2),
                vwap: Some(150.0),
                volume: 1000.0,
                volatility: 0.02,
                rsi: Some(55.0),
                atr: Some(0.5),
            }),
            pattern_meta: Some(PatternMeta {
                name: "ema_crossover".to_string(),
                description: "EMA crossover".to_string(),
                tags: vec!["momentum".to_string()],
                strength: 0.6,
                polarity: 0.75,
                action: "buy".to_string(),
                confidence: 0.8,
                features: vec![],
            }),
        };

        let json = serde_json::to_string(&signal).unwrap();
        let deserialized: Signal = serde_json::from_str(&json).unwrap();

        assert_eq!(signal.id, deserialized.id);
        assert_eq!(signal.symbol, deserialized.symbol);
        assert!((signal.score - deserialized.score).abs() < 1e-10);
    }
}