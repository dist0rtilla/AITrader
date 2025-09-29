//! Minimal replay helper
//!
//! Provides a small library function that can replay a ticks CSV file. For the
//! pyo3 binding we provide a simple, safe implementation that reads the file
//! and returns the number of non-empty lines processed. This is intentionally
//! small and side-effect free; it can be extended to wire into the full engine.

use anyhow::{anyhow, Result};
use std::fs::File;
use std::io::{BufRead, BufReader};
use crate::publisher::{Tick, Publisher};
use tokio::runtime::Runtime;

/// Internal trait used by replay to publish ticks/signals. This allows tests
/// to inject a mock publisher without creating a live Redis client.
#[async_trait::async_trait]
pub trait PublisherLike: Send + Sync {
    async fn publish_tick(&self, tick: Tick) -> anyhow::Result<String>;
    async fn publish_signal(&self, signal: crate::publisher::Signal) -> anyhow::Result<String>;
}

#[async_trait::async_trait]
impl PublisherLike for Publisher {
    async fn publish_tick(&self, tick: Tick) -> anyhow::Result<String> {
        Publisher::publish_tick(self, tick).await
    }

    async fn publish_signal(&self, signal: crate::publisher::Signal) -> anyhow::Result<String> {
        Publisher::publish_signal(self, signal).await
    }
}

/// Run a replay from a CSV of ticks. Returns number of data rows processed.
/// If `path` is None, an error is returned.
pub fn run_replay(path: Option<&str>) -> Result<i32> {
    // Backwards-compatible simple count
    let path = path.ok_or_else(|| anyhow!("ticks csv path required"))?;
    let f = File::open(path).map_err(|e| anyhow!("failed to open {}: {}", path, e))?;
    let reader = BufReader::new(f);
    let mut count: i32 = 0;
    for line in reader.lines() {
        let l = line.map_err(|e| anyhow!("io error: {}", e))?;
        if l.trim().is_empty() {
            continue;
        }
        // optionally skip a header row if starts with known header tokens
        if count == 0 {
            let h = l.trim_start();
            if h.starts_with("symbol") || h.starts_with("timestamp") || h.starts_with("price") {
                // treat as header and skip
                continue;
            }
        }
        count = count.saturating_add(1);
    }
    Ok(count)
}

/// Richer replay: parse CSV rows into `Tick` and optionally publish them.
/// If `redis_url` is Some, a `Publisher` will be created and used to publish ticks.
/// Returns the number of ticks processed.
pub fn run_replay_publish(path: Option<&str>, redis_url: Option<&str>) -> Result<i32> {
    let path = path.ok_or_else(|| anyhow!("ticks csv path required"))?;
    let f = File::open(path).map_err(|e| anyhow!("failed to open {}: {}", path, e))?;
    let reader = BufReader::new(f);

    // If redis_url provided, create a Publisher. We need a tokio runtime to run async code.
    let runtime = Runtime::new().map_err(|e| anyhow!("failed to create runtime: {}", e))?;
    let publisher: Option<Publisher> = match redis_url {
        Some(url) => Some(Publisher::new(url).map_err(|e| anyhow!("failed to create publisher: {}", e))?),
        None => None,
    };

    let mut processed: i32 = 0;
    // Simple CSV parsing: symbol,price,volume,timestamp per line (comma separated)
    for line in reader.lines() {
        let l = line.map_err(|e| anyhow!("io error: {}", e))?;
        let s = l.trim();
        if s.is_empty() {
            continue;
        }
        // Skip optional header
        if processed == 0 {
            let h = s.to_lowercase();
            if h.starts_with("symbol") || h.starts_with("timestamp") || h.starts_with("price") {
                continue;
            }
        }

        let parts: Vec<&str> = s.split(',').map(|p| p.trim()).collect();
        if parts.len() < 4 {
            // ignore malformed lines
            continue;
        }

        let symbol = parts[0].to_string();
        let price: f64 = parts[1].parse().unwrap_or(0.0);
        let volume: f64 = parts[2].parse().unwrap_or(0.0);
        let timestamp: f64 = parts[3].parse().unwrap_or(0.0);

        let tick = Tick { symbol, price, volume, timestamp };

        if let Some(ref pubref) = publisher {
            // run the async publish in the runtime
            let p = pubref;
            let t = tick.clone();
            let res = runtime.block_on(async move { p.publish_tick(t).await });
            if let Err(e) = res {
                tracing::error!("failed to publish tick: {}", e);
            }
        }

        processed = processed.saturating_add(1);
    }

    Ok(processed)
}
