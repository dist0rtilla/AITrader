"""Configuration helpers for pattern_engine.

This module centralizes configuration values and environment-driven
overrides so the package does not rely on hardcoded "magic numbers".
"""
from dataclasses import dataclass
import os
from typing import Optional


def _env_float(name: str, default: float) -> float:
    v = os.environ.get(name)
    if v is None or v == "":
        return default
    try:
        return float(v)
    except Exception:
        return default


def _env_int(name: str, default: int) -> int:
    v = os.environ.get(name)
    if v is None or v == "":
        return default
    try:
        return int(v)
    except Exception:
        return default


@dataclass
class PatternEngineConfig:
    # Redis
    redis_url: str = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

    # Streams
    signals_stream: str = os.environ.get('SIGNALS_STREAM', 'signals:global')
    ticks_stream: str = os.environ.get('TICKS_STREAM', 'ticks:global')

    # Detection thresholds
    ema_diff_threshold: float = _env_float('EMA_DIFF_THRESHOLD', 0.01)
    vwap_diff_threshold: float = _env_float('VWAP_DIFF_THRESHOLD', 0.005)
    signal_score_min: float = _env_float('SIGNAL_SCORE_MIN', 0.3)

    # Volume handling
    volume_ema_alpha: float = _env_float('VOLUME_EMA_ALPHA', 0.1)
    volume_spike_multiplier: float = _env_float('VOLUME_SPIKE_MULTIPLIER', 2.0)

    # Cooldowns and timings
    signal_cooldown_seconds: int = _env_int('SIGNAL_COOLDOWN', 30)

    # Redis retry
    redis_max_retries: int = _env_int('REDIS_MAX_RETRIES', 3)
    redis_retry_delay_seconds: float = _env_float('REDIS_RETRY_DELAY', 0.5)

    # TP/SL scaling based on confidence
    tp_base_pct: float = _env_float('PATTERN_TP_BASE_PCT', 0.006)
    sl_base_pct: float = _env_float('PATTERN_SL_BASE_PCT', 0.006)
    tp_confidence_scale: float = _env_float('PATTERN_TP_CONF_SCALE', 0.010)
    sl_confidence_scale: float = _env_float('PATTERN_SL_CONF_SCALE', 0.010)

    # Partitioning / clustering
    partition_count: int = _env_int('PARTITION_COUNT', 1)
    partition_index: int = _env_int('PARTITION_INDEX', 0)
    symbol_weights_file: str = os.environ.get('SYMBOL_WEIGHTS_FILE', '')
    hot_symbols: str = os.environ.get('HOT_SYMBOLS', '')  # comma-separated optional


# single module-level config instance for simple imports
cfg = PatternEngineConfig()
