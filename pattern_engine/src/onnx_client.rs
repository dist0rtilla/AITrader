//! Optional ONNX client for ML inference.
//!
//! This module provides an interface to ONNX Runtime for model inference.
//! It's optional and can be disabled if ONNX support is not needed.

#[cfg(feature = "onnx")]
use anyhow::Result;
#[cfg(feature = "onnx")]
use std::path::Path;

#[cfg(feature = "onnx")]
pub struct OnnxClient {
    // ONNX runtime session would go here
    // For now, this is a placeholder
}

#[cfg(feature = "onnx")]
impl OnnxClient {
    /// Create a new ONNX client with the given model path
    pub fn new(_model_path: &Path) -> Result<Self> {
        // TODO: Initialize ONNX runtime session
        // This would load the model and create an inference session
        Ok(Self {})
    }

    /// Run inference on the given features
    pub fn infer(&self, _features: &[f64]) -> Result<f64> {
        // TODO: Run actual inference
        // For now, return a simple stub result
        Ok(0.0)
    }
}

#[cfg(not(feature = "onnx"))]
/// Stub implementation when ONNX feature is not enabled
pub struct OnnxClient;

#[cfg(not(feature = "onnx"))]
impl OnnxClient {
    /// Create a new ONNX client (stub)
    pub fn new(_model_path: &std::path::Path) -> anyhow::Result<Self> {
        Ok(Self)
    }

    /// Run inference (stub implementation)
    pub fn infer(&self, features: &[f64]) -> anyhow::Result<f64> {
        // Simple deterministic stub based on feature sum
        let sum: f64 = features.iter().sum();
        let score = sum / (features.len() as f64 + 1e-9);
        Ok(score.max(-1.0).min(1.0))
    }
}

/// Default model stub function (always available)
pub fn default_model_stub(features: &[f64]) -> f64 {
    let sum: f64 = features.iter().sum();
    let score = sum / (features.len() as f64 + 1e-9);
    score.max(-1.0).min(1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_model_stub() {
        let features = vec![1.0, 2.0, 3.0];
        let result = default_model_stub(&features);
        assert!(result >= -1.0 && result <= 1.0);
    }

    #[test]
    fn test_onnx_client_stub() {
        let client = OnnxClient::new(std::path::Path::new("dummy.onnx")).unwrap();
        let features = vec![1.0, 2.0, 3.0];
        let result = client.infer(&features).unwrap();
        assert!(result >= -1.0 && result <= 1.0);
    }
}