//! Incremental mathematical functions for pattern detection.
//!
//! Provides efficient, online algorithms for:
//! - EMA: Exponential Moving Average
//! - VWAP: Volume Weighted Average Price
//! - Welford: Online variance and standard deviation

/// Exponential Moving Average calculator
#[derive(Debug, Clone)]
pub struct EMA {
    alpha: f64,
    value: Option<f64>,
}

impl EMA {
    /// Create a new EMA with given alpha (smoothing factor)
    /// Alpha should be between 0.0 and 1.0
    pub fn new(alpha: f64) -> Self {
        assert!(alpha > 0.0 && alpha <= 1.0, "Alpha must be in (0.0, 1.0]");
        Self {
            alpha,
            value: None,
        }
    }

    /// Update EMA with new value and return current EMA
    pub fn update(&mut self, x: f64) -> f64 {
        match self.value {
            None => {
                self.value = Some(x);
                x
            }
            Some(current) => {
                let new_value = self.alpha * x + (1.0 - self.alpha) * current;
                self.value = Some(new_value);
                new_value
            }
        }
    }

    /// Get current EMA value
    pub fn value(&self) -> Option<f64> {
        self.value
    }
}

/// Volume Weighted Average Price calculator
#[derive(Debug, Clone)]
pub struct VWAP {
    pv: f64,      // price * volume accumulator
    volume: f64,  // total volume accumulator
}

impl VWAP {
    /// Create a new VWAP calculator
    pub fn new() -> Self {
        Self {
            pv: 0.0,
            volume: 0.0,
        }
    }

    /// Update VWAP with price and volume, return current VWAP
    pub fn update(&mut self, price: f64, volume: f64) -> f64 {
        self.pv += price * volume;
        self.volume += volume;

        if self.volume == 0.0 {
            0.0
        } else {
            self.pv / self.volume
        }
    }

    /// Get current VWAP value
    pub fn value(&self) -> f64 {
        if self.volume == 0.0 {
            0.0
        } else {
            self.pv / self.volume
        }
    }
}

/// Welford's online algorithm for variance and standard deviation
#[derive(Debug, Clone)]
pub struct Welford {
    count: u64,
    mean: f64,
    m2: f64,  // sum of squared differences
}

impl Welford {
    /// Create a new Welford calculator
    pub fn new() -> Self {
        Self {
            count: 0,
            mean: 0.0,
            m2: 0.0,
        }
    }

    /// Update with new value
    pub fn update(&mut self, x: f64) {
        self.count += 1;
        let delta = x - self.mean;
        self.mean += delta / self.count as f64;
        let delta2 = x - self.mean;
        self.m2 += delta * delta2;
    }

    /// Get sample variance (divided by n-1)
    pub fn variance(&self) -> f64 {
        if self.count < 2 {
            0.0
        } else {
            self.m2 / (self.count - 1) as f64
        }
    }

    /// Get sample standard deviation
    pub fn std(&self) -> f64 {
        self.variance().sqrt()
    }

    /// Get current mean
    pub fn mean(&self) -> f64 {
        self.mean
    }

    /// Get count of observations
    pub fn count(&self) -> u64 {
        self.count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ema() {
        let mut ema = EMA::new(0.1);

        // First value should be returned as-is
        assert_eq!(ema.update(10.0), 10.0);
        assert_eq!(ema.value(), Some(10.0));

        // Subsequent values should be smoothed
        let second = ema.update(12.0);
        assert!(second > 10.0 && second < 12.0);
    }

    #[test]
    fn test_vwap() {
        let mut vwap = VWAP::new();

        // First update
        assert_eq!(vwap.update(100.0, 10.0), 100.0);

        // Second update
        assert_eq!(vwap.update(102.0, 5.0), 100.66666666666667);

        // Third update
        assert_eq!(vwap.update(98.0, 15.0), 99.33333333333333);
    }

    #[test]
    fn test_welford() {
        let mut welford = Welford::new();

        // Add some test data
        welford.update(10.0);
        welford.update(12.0);
        welford.update(14.0);

        assert_eq!(welford.count(), 3);
        assert_eq!(welford.mean(), 12.0);
        assert_eq!(welford.variance(), 4.0); // Sample variance
        assert_eq!(welford.std(), 2.0);
    }
}