use crate::onnx_client::default_model_stub;
use crate::onnx_client::OnnxClient;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// Extended metadata for a known or inferred pattern
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PatternMeta {
    pub name: String,
    pub description: String,
    /// Tags for categorization (e.g., reversal, continuation)
    pub tags: Vec<String>,
    /// Normalized strength 0..1 indicating how strong the pattern is
    pub strength: f64,
    /// polarity -1..1 indicating bearish (-1) to bullish (+1)
    pub polarity: f64,
    /// Suggested action (buy/sell/hold)
    pub action: String,
    /// Confidence in the suggestion 0..1
    pub confidence: f64,
    /// Optional feature vector used for ML inference (can be empty for known patterns)
    pub features: Vec<f64>,
}

/// Pattern library which holds known pattern definitions and can consult ML for unknown patterns
pub struct PatternLibrary {
    known: HashMap<String, PatternMeta>,
    ml_client: OnnxClient,
}

impl PatternLibrary {
    /// Create a new pattern library with a given ONNX model path (stub if feature disabled)
    pub fn new(model_path: &Path) -> anyhow::Result<Self> {
        let ml_client = OnnxClient::new(model_path)?;

        // Seed with some canonical patterns
        let mut known = HashMap::new();
        known.insert("double_top".to_string(), PatternMeta {
            name: "double_top".to_string(),
            description: "Two peaks at similar levels followed by a drop".to_string(),
            tags: vec!["reversal".to_string(), "bearish".to_string()],
            strength: 0.85,
            polarity: -0.9,
            action: "sell".to_string(),
            confidence: 0.9,
            features: vec![],
        });
        known.insert("double_bottom".to_string(), PatternMeta {
            name: "double_bottom".to_string(),
            description: "Two troughs at similar levels followed by a rise".to_string(),
            tags: vec!["reversal".to_string(), "bullish".to_string()],
            strength: 0.8,
            polarity: 0.9,
            action: "buy".to_string(),
            confidence: 0.88,
            features: vec![],
        });
        known.insert("head_and_shoulders".to_string(), PatternMeta {
            name: "head_and_shoulders".to_string(),
            description: "Classic reversal pattern with a higher peak between two lower peaks".to_string(),
            tags: vec!["reversal".to_string(), "bearish".to_string()],
            strength: 0.82,
            polarity: -0.8,
            action: "sell".to_string(),
            confidence: 0.87,
            features: vec![],
        });

        Ok(Self { known, ml_client })
    }

    /// Lookup a pattern by name. If unknown, consult the ML model using `features`.
    /// Returns a PatternMeta either from the known library or synthesized from ML score.
    /// Lookup a pattern by name. If unknown, consult the ML model using `features`.
    /// Returns a PatternMeta either from the known library or synthesized from ML score.
    pub fn lookup_or_infer(&self, pattern_name: &str, features: Option<&[f64]>) -> anyhow::Result<PatternMeta> {
        if let Some(meta) = self.known.get(pattern_name) {
            return Ok(meta.clone());
        }

        // Unknown pattern: use ML inference if features provided, otherwise use default stub
        let feat_vec = features.map(|f| f.to_vec()).unwrap_or_default();
        let score = if feat_vec.is_empty() {
            default_model_stub(&[])
        } else {
            self.ml_client.infer(&feat_vec)?
        };

        // Convert score into strength/confidence/action heuristics
        let strength = score.abs();
        let confidence = (strength * 0.9).min(1.0);
        let action = if score > 0.2 { "buy" } else if score < -0.2 { "sell" } else { "hold" };
        let tags = if score > 0.0 { vec!["bullish".to_string()] } else { vec!["bearish".to_string()] };

        Ok(PatternMeta {
            name: pattern_name.to_string(),
            description: format!("Synthesized pattern inferred by ML with score {:.3}", score),
            tags,
            strength,
            polarity: score,
            action: action.to_string(),
            confidence,
            features: feat_vec,
        })
    }

    /// Returns true if the pattern name is known in the seeded library
    pub fn is_known(&self, pattern_name: &str) -> bool {
        self.known.contains_key(pattern_name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lookup_known() {
        let lib = PatternLibrary::new(std::path::Path::new("dummy.onnx")).unwrap();
        let meta = lib.lookup_or_infer("double_top", None).unwrap();
        assert_eq!(meta.name, "double_top");
        assert!(meta.polarity < 0.0);
        assert_eq!(meta.action, "sell");
        assert!(meta.confidence > 0.0);
    }

    #[test]
    fn test_infer_unknown_with_features() {
        let lib = PatternLibrary::new(std::path::Path::new("dummy.onnx")).unwrap();
        let features = vec![1.0, -0.5, 0.25];
        let meta = lib.lookup_or_infer("mystery_pattern", Some(&features)).unwrap();
        assert_eq!(meta.name, "mystery_pattern");
        assert!(meta.polarity >= -1.0 && meta.polarity <= 1.0);
        assert_eq!(meta.features, features);
        assert!(meta.confidence >= 0.0 && meta.confidence <= 1.0);
    }
}
