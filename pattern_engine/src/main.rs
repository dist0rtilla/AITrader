//! Pattern Engine Service - Main entry point
//!
//! This service runs the pattern detection algorithm on streaming market data
//! and publishes trading signals to Redis streams for consumption by the Strategy Engine.

use anyhow::Result;
use axum::{
    extract::{State, Query},
    response::Json,
    routing::get,
    Router,
};
use hyper::server::Server;
use pattern_engine::{
    incremental::{EMA, VWAP, Welford},
    publisher::{Publisher, Signal, SignalMeta, Tick},
    patterns::PatternLibrary,
};
use serde::Serialize;
use std::{collections::HashMap, env, sync::Arc, time::Duration};
use std::time::Instant;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;
use tracing::{error, info};

/// Simple OHLC candle used for interval aggregation
#[derive(Debug, Clone)]
struct Candle {
    start: u64,
    open: f64,
    high: f64,
    low: f64,
    close: f64,
    volume: f64,
}

/// Per-symbol state for pattern detection
#[derive(Debug)]
struct SymbolState {
    symbol: String,
    ema_fast: EMA,
    ema_slow: EMA,
    vwap: VWAP,
    welford: Welford,
    last_signal_time: f64,
    signal_cooldown: f64,
    // Running average for volume and count for simple volume-based features
    avg_volume: f64,
    volume_count: u64,
    // RSI (Wilder) state
    prev_close: Option<f64>,
    rsi_avg_gain: f64,
    rsi_avg_loss: f64,
    rsi_period: usize,
    // ATR state
    atr: f64,
    atr_period: usize,
}

impl SymbolState {
    fn new(symbol: String) -> Self {
        Self {
            symbol,
            ema_fast: EMA::new(0.1), // 10-period equivalent
            ema_slow: EMA::new(0.05), // 20-period equivalent
            vwap: VWAP::new(),
            welford: Welford::new(),
            last_signal_time: 0.0,
            signal_cooldown: 30.0, // 30 seconds between signals
            avg_volume: 0.0,
            volume_count: 0,
            prev_close: None,
            rsi_avg_gain: 0.0,
            rsi_avg_loss: 0.0,
            rsi_period: 14,
            atr: 0.0,
            atr_period: 14,
        }
    }

    /// Update indicators and detect patterns
    fn update_and_detect(&mut self, price: f64, volume: f64, timestamp: f64) -> Option<Signal> {
        // Update all indicators
        let ema_fast = self.ema_fast.update(price);
        let ema_slow = self.ema_slow.update(price);
        let vwap_price = self.vwap.update(price, volume);
        self.welford.update(price);

        // Update running average for volume
        self.volume_count += 1;
        let n = self.volume_count as f64;
        if n == 1.0 {
            self.avg_volume = volume;
        } else {
            self.avg_volume += (volume - self.avg_volume) / n;
        }

        // RSI and ATR updates
        if let Some(prev) = self.prev_close {
            let change = price - prev;
            let gain = if change > 0.0 { change } else { 0.0 };
            let loss = if change < 0.0 { -change } else { 0.0 };
            if self.volume_count as usize <= self.rsi_period {
                // initial average
                self.rsi_avg_gain = (self.rsi_avg_gain * (self.volume_count as f64 - 1.0) + gain) / (self.volume_count as f64);
                self.rsi_avg_loss = (self.rsi_avg_loss * (self.volume_count as f64 - 1.0) + loss) / (self.volume_count as f64);
            } else {
                // Wilder smoothing
                self.rsi_avg_gain = (self.rsi_avg_gain * (self.rsi_period as f64 - 1.0) + gain) / (self.rsi_period as f64);
                self.rsi_avg_loss = (self.rsi_avg_loss * (self.rsi_period as f64 - 1.0) + loss) / (self.rsi_period as f64);
            }
            // ATR (True Range)
            let tr = (price - prev).abs();
            if self.atr == 0.0 {
                self.atr = tr;
            } else {
                self.atr = (self.atr * (self.atr_period as f64 - 1.0) + tr) / (self.atr_period as f64);
            }
        }
        self.prev_close = Some(price);

        // Pattern detection logic
        let mut signal_score = 0.0;
        let mut pattern_type = None;

        // EMA Crossover Pattern
        let ema_fast_val = ema_fast;
        let ema_slow_val = ema_slow;
        if ema_fast_val > 0.0 && ema_slow_val > 0.0 {
            let ema_diff = (ema_fast_val - ema_slow_val) / ema_slow_val;
            if ema_diff.abs() > 0.01 { // 1% difference threshold
                signal_score += ema_diff * 2.0; // Amplify signal
                pattern_type = Some("ema_crossover".to_string());
            }
        }

        // VWAP Deviation Pattern
        if vwap_price > 0.0 {
            let vwap_diff = (price - vwap_price) / vwap_price;
            if vwap_diff.abs() > 0.005 { // 0.5% deviation threshold
                signal_score += vwap_diff * 1.5;
                if pattern_type.is_none() {
                    pattern_type = Some("vwap_deviation".to_string());
                }
            }
        }

        // Volume Spike Pattern (simplified)
        if volume > 0.0 {
            let avg_volume = 1000.0; // Placeholder - should be calculated
            let volume_ratio = volume / avg_volume;
            if volume_ratio > 2.0 { // 2x average volume
                signal_score += if signal_score > 0.0 { 0.3 } else { -0.3 };
                pattern_type = Some("volume_spike".to_string());
            }
        }

        // Volatility Pattern
        if self.welford.count() > 5 {
            let volatility = self.welford.std();
            let price_change = (price - ema_fast_val).abs() / price;
            if price_change > volatility * 2.0 { // 2 standard deviations
                signal_score += if signal_score > 0.0 { 0.4 } else { -0.4 };
                pattern_type = Some("volatility_breakout".to_string());
            }
        }

        // Normalize signal score to [-1, 1]
        signal_score = signal_score.max(-1.0).min(1.0);

        // Only generate signal if significant and not in cooldown
        if signal_score.abs() > 0.3 && (timestamp - self.last_signal_time) > self.signal_cooldown {
            self.last_signal_time = timestamp;

            let signal = Signal {
                id: format!("{}_{}", self.symbol, timestamp as i64),
                symbol: self.symbol.clone(),
                score: signal_score,
                pattern: pattern_type.unwrap_or_else(|| "composite".to_string()),
                timestamp,
                meta: Some(SignalMeta {
                    ema_fast: Some(ema_fast_val),
                    ema_slow: Some(ema_slow_val),
                    vwap: Some(vwap_price),
                    volume,
                    volatility: self.welford.std(),
                    rsi: if self.rsi_avg_loss > 0.0 {
                        let rs = self.rsi_avg_gain / self.rsi_avg_loss;
                        Some(100.0 - (100.0 / (1.0 + rs)))
                    } else {
                        Some(100.0)
                    },
                    atr: Some(self.atr),
                }),
                pattern_meta: None,
            };

            Some(signal)
        } else {
            None
        }
    }
}

/// Application state
#[derive(Clone)]
struct AppState {
    publisher: Arc<Mutex<Publisher>>,
    symbol_states: Arc<Mutex<HashMap<String, SymbolState>>>,
    pattern_lib: Arc<PatternLibrary>,
    // Telemetry
    inferred_count: Arc<AtomicU64>,
    known_count: Arc<AtomicU64>,
    total_infer_latency_ns: Arc<AtomicU64>,
    // per-symbol telemetry: symbol -> (inferred, known, total_latency_ns)
    per_symbol_metrics: Arc<Mutex<HashMap<String, (u64, u64, u64)>>>,
}

/// Health check response
#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
    status: String,
    active_symbols: usize,
    signals_stream: String,
    ticks_stream: String,
    timestamp: f64,
}

#[derive(Serialize)]
struct PerSymbolMetrics {
    inferred: u64,
    known: u64,
    avg_latency_ms: f64,
}

#[derive(Serialize)]
struct MetricsResponse {
    inferred_count: u64,
    known_count: u64,
    avg_infer_latency_ms: f64,
    per_symbol: std::collections::HashMap<String, PerSymbolMetrics>,
}

/// Generate mock tick data for testing
async fn generate_mock_ticks(state: AppState) -> Result<()> {
    info!("Generating mock tick data for pattern detection");

    let symbols: Vec<String> = vec!["AAPL".to_string(), "GOOGL".to_string(), "MSFT".to_string(), "TSLA".to_string(), "AMZN".to_string()];
    let mut base_prices: HashMap<String, f64> = [
        ("AAPL".to_string(), 150.0),
        ("GOOGL".to_string(), 2800.0),
        ("MSFT".to_string(), 380.0),
        ("TSLA".to_string(), 250.0),
        ("AMZN".to_string(), 3400.0),
    ].into_iter().collect();

    let mut tick_count = 0u64;
    // Candle maps: symbol -> interval -> current candle
    use std::collections::BTreeMap;
    let intervals = vec![60u64, 300u64]; // 60s and 5min
    let mut candles: HashMap<String, BTreeMap<u64, Candle>> = HashMap::new();

    loop {
        for symbol in &symbols {
            // Generate realistic price movement
            let base_price = *base_prices.get(symbol).unwrap_or(&100.0);
            let price_change = (rand::random::<f64>() - 0.5) * base_price * 0.002; // 0.2% volatility
            let new_price = base_price + price_change;
            base_prices.insert(symbol.to_string(), new_price);

            let volume = (rand::random::<f64>() * 4900.0 + 100.0) as f64;
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs_f64();

            // Update per-interval candles
            for &intv in &intervals {
                let start = (timestamp as u64 / intv) * intv;
                let entry = candles.entry(symbol.to_string()).or_default();
                let c = entry.entry(intv).or_insert_with(|| Candle {
                    start,
                    open: new_price,
                    high: new_price,
                    low: new_price,
                    close: new_price,
                    volume,
                });

                if c.start == start {
                    // update candle
                    c.high = c.high.max(new_price);
                    c.low = c.low.min(new_price);
                    c.close = new_price;
                    c.volume += volume;
                } else {
                    // Candle closed - run detection on closed candle
                    let closed = c.clone();
                    // reset candle to new interval
                    *c = Candle {
                        start,
                        open: new_price,
                        high: new_price,
                        low: new_price,
                        close: new_price,
                        volume,
                    };

                    // Run detection using closed.close as price and closed.volume
                    let mut symbol_states = state.symbol_states.lock().await;
                    let symbol_state = symbol_states
                        .entry(symbol.to_string())
                        .or_insert_with(|| SymbolState::new(symbol.to_string()));

                    if let Some(mut sig) = symbol_state.update_and_detect(closed.close, closed.volume, closed.start as f64) {
                        // suffix pattern with interval for context
                        sig.pattern = format!("{}:{}s", sig.pattern, intv);

                        // extract features from sig.meta similar to tick flow
                        let (price_ema_fast, price_ema_slow, price_vwap, meta_volume, meta_volatility) = if let Some(ref m) = sig.meta {
                            (
                                m.ema_fast.unwrap_or(0.0),
                                m.ema_slow.unwrap_or(0.0),
                                m.vwap.unwrap_or(0.0),
                                m.volume,
                                m.volatility,
                            )
                        } else {
                            (0.0, 0.0, 0.0, closed.volume, 0.0)
                        };

                        let ema_diff = price_ema_fast - price_ema_slow;
                        let ema_diff_pct = if price_ema_slow.abs() > f64::EPSILON { ema_diff / price_ema_slow } else { 0.0 };
                        let vwap_deviation = if price_vwap.abs() > f64::EPSILON { (closed.close - price_vwap) / price_vwap } else { 0.0 };
                        let volume_ratio = if symbol_state.avg_volume > 0.0 { meta_volume / symbol_state.avg_volume } else { 1.0 };
                        let momentum = closed.close - price_ema_slow;
                        let momentum_from_open = closed.close - closed.open;
                        let open_pct = if closed.open.abs() > f64::EPSILON { (closed.close - closed.open) / closed.open } else { 0.0 };
                        let volatility = meta_volatility;

                        let features = vec![ema_diff, ema_diff_pct, vwap_deviation, volume_ratio, momentum, momentum_from_open, open_pct, volatility];

                        // Telemetry: measure inference and update known/inferred counters
                        let start = Instant::now();
                        let pattern_meta = match state.pattern_lib.lookup_or_infer(&sig.pattern, Some(&features)) {
                            Ok(pm) => {
                                // If the pattern is known, increment known_count, else inferred_count
                                if state.pattern_lib.is_known(&sig.pattern) {
                                    state.known_count.fetch_add(1, Ordering::Relaxed);
                                } else {
                                    state.inferred_count.fetch_add(1, Ordering::Relaxed);
                                }
                                Some(pm)
                            }
                            Err(e) => {
                                error!("PatternLibrary inference error: {}", e);
                                None
                            }
                        };
                        let elapsed = start.elapsed();
                        let ns = elapsed.as_nanos() as u64;
                        state.total_infer_latency_ns.fetch_add(ns, Ordering::Relaxed);
                        // update per-symbol metrics
                        {
                            let mut pm = state.per_symbol_metrics.lock().await;
                            let entry = pm.entry(symbol.to_string()).or_insert((0u64, 0u64, 0u64));
                            if state.pattern_lib.is_known(&sig.pattern) {
                                entry.1 += 1; // known
                            } else {
                                entry.0 += 1; // inferred
                            }
                            entry.2 += ns; // add latency
                        }

                        sig.pattern_meta = pattern_meta;

                        let publisher = state.publisher.lock().await;
                        if let Err(e) = publisher.publish_signal(sig).await {
                            error!("Failed to publish interval signal: {}", e);
                        }
                    }
                }
            }

            // Update pattern detection (tick-level)
            {
                let mut symbol_states = state.symbol_states.lock().await;
                let symbol_state = symbol_states
                    .entry(symbol.to_string())
                    .or_insert_with(|| SymbolState::new(symbol.to_string()));

                let signal = symbol_state.update_and_detect(new_price, volume, timestamp);

                // Publish tick data
                let tick = Tick {
                    symbol: symbol.to_string(),
                    price: new_price,
                    volume,
                    timestamp,
                };

                let publisher = state.publisher.lock().await;
                if let Err(e) = publisher.publish_tick(tick).await {
                    error!("Failed to publish tick: {}", e);
                }

                // Publish signal if detected
                if let Some(mut signal) = signal {
                    // Extract features from signal.meta if available
                    let (price_ema_fast, price_ema_slow, price_vwap, meta_volume, meta_volatility) = if let Some(ref m) = signal.meta {
                        (
                            m.ema_fast.unwrap_or(0.0),
                            m.ema_slow.unwrap_or(0.0),
                            m.vwap.unwrap_or(0.0),
                            m.volume,
                            m.volatility,
                        )
                    } else {
                        (0.0, 0.0, 0.0, volume, 0.0)
                    };

                    // Derived features
                    let ema_diff = price_ema_fast - price_ema_slow;
                    let ema_diff_pct = if price_ema_slow.abs() > f64::EPSILON { ema_diff / price_ema_slow } else { 0.0 };
                    let vwap_deviation = if price_vwap.abs() > f64::EPSILON { (new_price - price_vwap) / price_vwap } else { 0.0 };
                    let volume_ratio = if symbol_state.avg_volume > 0.0 { meta_volume / symbol_state.avg_volume } else { 1.0 };
                    let momentum = new_price - price_ema_slow; // simple momentum
                    let volatility = meta_volatility;

                    let features = vec![ema_diff, ema_diff_pct, vwap_deviation, volume_ratio, momentum, volatility];

                    // Consult pattern library to enrich meta
                    // Telemetry: measure inference and update known/inferred counters
                    let start = Instant::now();
                    let pattern_meta = match state.pattern_lib.lookup_or_infer(&signal.pattern, Some(&features)) {
                        Ok(pm) => {
                            if state.pattern_lib.is_known(&signal.pattern) {
                                state.known_count.fetch_add(1, Ordering::Relaxed);
                            } else {
                                state.inferred_count.fetch_add(1, Ordering::Relaxed);
                            }
                            Some(pm)
                        }
                        Err(e) => {
                            error!("PatternLibrary inference error: {}", e);
                            None
                        }
                    };

                    let elapsed = start.elapsed();
                    let ns = elapsed.as_nanos() as u64;
                    state.total_infer_latency_ns.fetch_add(ns, Ordering::Relaxed);
                    // update per-symbol metrics for tick-level inference
                    {
                        let mut pm = state.per_symbol_metrics.lock().await;
                        let entry = pm.entry(symbol.to_string()).or_insert((0u64, 0u64, 0u64));
                        if state.pattern_lib.is_known(&signal.pattern) {
                            entry.1 += 1;
                        } else {
                            entry.0 += 1;
                        }
                        entry.2 += ns;
                    }

                    signal.pattern_meta = pattern_meta;

                    if let Err(e) = publisher.publish_signal(signal).await {
                        error!("Failed to publish signal: {}", e);
                    }
                }
            }

            tick_count += 1;
            if tick_count % 100 == 0 {
                let active_symbols = state.symbol_states.lock().await.len();
                info!("Processed {} ticks, {} symbols active", tick_count, active_symbols);
            }
        }

        // Wait before next tick batch
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}

/// Health check endpoint
async fn health_check(State(state): State<AppState>) -> Json<HealthResponse> {
    let active_symbols = state.symbol_states.lock().await.len();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64();

    Json(HealthResponse {
        ok: true,
        status: "healthy".to_string(),
        active_symbols,
        signals_stream: "signals:global".to_string(),
        ticks_stream: "ticks:global".to_string(),
        timestamp,
    })
}

/// Metrics endpoint exposing telemetry counters
async fn metrics(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>) -> Json<MetricsResponse> {
    let inferred = state.inferred_count.load(Ordering::Relaxed);
    let known = state.known_count.load(Ordering::Relaxed);
    let total_ns = state.total_infer_latency_ns.load(Ordering::Relaxed);
    // Use inferred-only denominators for average latency
    let avg_ms = if inferred > 0 {
        (total_ns as f64 / (inferred as f64)) / 1_000_000.0
    } else {
        0.0
    };

    // Build per-symbol metrics snapshot
    let mut per_symbol_map = std::collections::HashMap::new();
    let pm = state.per_symbol_metrics.lock().await;
    if let Some(sym_filter) = params.get("symbol") {
        if let Some((inf, kn, total)) = pm.get(sym_filter) {
            let avg = if *inf > 0 { (*total as f64 / (*inf as f64)) / 1_000_000.0 } else { 0.0 };
            per_symbol_map.insert(sym_filter.clone(), PerSymbolMetrics {
                inferred: *inf,
                known: *kn,
                avg_latency_ms: avg,
            });
        }
    } else {
        for (sym, (inf, kn, total)) in pm.iter() {
            let avg = if *inf > 0 { (*total as f64 / (*inf as f64)) / 1_000_000.0 } else { 0.0 };
            per_symbol_map.insert(sym.clone(), PerSymbolMetrics {
                inferred: *inf,
                known: *kn,
                avg_latency_ms: avg,
            });
        }
    }

    Json(MetricsResponse {
        inferred_count: inferred,
        known_count: known,
        avg_infer_latency_ms: avg_ms,
        per_symbol: per_symbol_map,
    })
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting Rust Pattern Engine Service");

    // Environment configuration
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://redis:6379/0".to_string());
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT")
        .unwrap_or_else(|_| "8005".to_string())
        .parse::<u16>()?;

    // Initialize publisher
    let publisher = Publisher::new(&redis_url)?;
    let publisher = Arc::new(Mutex::new(publisher));

    // Initialize application state and pattern library
    let symbol_states = Arc::new(Mutex::new(HashMap::new()));
    // Model path can be provided via MODEL_PATH env var; default to `models/pattern_model.onnx`
    let model_path_str = env::var("MODEL_PATH").unwrap_or_else(|_| "models/pattern_model.onnx".to_string());
    let model_path = std::path::Path::new(&model_path_str);
    let pattern_lib = Arc::new(PatternLibrary::new(model_path)?);
    let app_state = AppState {
        publisher: publisher.clone(),
        symbol_states: symbol_states.clone(),
        pattern_lib: pattern_lib.clone(),
        inferred_count: Arc::new(AtomicU64::new(0)),
        known_count: Arc::new(AtomicU64::new(0)),
        total_infer_latency_ns: Arc::new(AtomicU64::new(0)),
        per_symbol_metrics: Arc::new(Mutex::new(HashMap::new())),
    };

    // Start mock tick generation
    let tick_state = app_state.clone();
    tokio::spawn(async move {
        if let Err(e) = generate_mock_ticks(tick_state).await {
            error!("Tick generation failed: {}", e);
        }
    });

    // Build Axum router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/metrics", get(metrics))
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    // Start server
    let addr = format!("{}:{}", host, port);
    info!("Pattern Engine listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    Server::builder(hyper::server::accept::from_stream(
        tokio_stream::wrappers::TcpListenerStream::new(listener)
    ))
    .serve(app.into_make_service())
    .await?;

    Ok(())
}