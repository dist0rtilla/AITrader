//! Pattern Engine - High-performance signal detection for trading
//!
//! This crate implements a Rust-based pattern engine that processes streaming
//! market data and generates trading signals using incremental algorithms.
//!
//! Key features:
//! - Ultra-low latency signal detection (<1ms target)
//! - Incremental mathematical functions (EMA, VWAP, Welford)
//! - Redis Streams publishing
//! - Optional ONNX model integration
//! - Async tokio runtime

pub mod incremental;
pub mod publisher;
pub mod onnx_client;
pub mod patterns;
pub mod replay;

// Re-export commonly used types
pub use incremental::{EMA, VWAP, Welford};
pub use publisher::{Publisher, Signal, SignalMeta, Tick};
pub use onnx_client::{OnnxClient, default_model_stub};
pub use patterns::{PatternLibrary, PatternMeta};
pub use replay::run_replay;
pub use replay::run_replay_publish;