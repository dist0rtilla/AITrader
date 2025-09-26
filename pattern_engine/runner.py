"""Simple pattern engine runner for replaying ticks and invoking a model.

This runner is intentionally simple: it reads newline-delimited CSV ticks
(ts,symbol,price,volume) from stdin or a file, maintains per-symbol state
and calls a provided model runner (TRT or stub).
"""
from typing import Dict, Callable, Optional
import csv
import sys
import logging
from .state import EMA, VWAP, Welford
from .trt_engine import has_tensorrt, TRTEngine

logger = logging.getLogger(__name__)


class SymbolState:
    def __init__(self):
        self.ema5 = EMA(0.2)
        self.vwap = VWAP()
        self.welford = Welford()


def default_model_stub(features):
    # Very small deterministic placeholder; returns a score between -1 and 1
    s = sum(features) / (len(features) + 1e-9)
    return float(max(-1.0, min(1.0, s)))


def run_replay(tick_csv_path: Optional[str], model_callable: Optional[Callable] = None):
    if model_callable is None:
        model_callable = default_model_stub
    states: Dict[str, SymbolState] = {}
    f = open(tick_csv_path, "r") if tick_csv_path else sys.stdin
    reader = csv.reader(f)
    for row in reader:
        try:
            ts, sym, price, vol = row
        except ValueError:
            logger.warning("Skipping malformed row: %s", row)
            continue
        price = float(price)
        vol = float(vol)
        st = states.get(sym)
        if st is None:
            st = SymbolState()
            states[sym] = st
        ema = st.ema5.update(price)
        vwap = st.vwap.update(price, vol)
        st.welford.update(price)
        features = [ema, vwap, st.welford.mean, st.welford.std]
        try:
            score = model_callable(features)
        except Exception as e:
            logger.exception("Model call failed, falling back to stub: %s", e)
            score = default_model_stub(features)
        print(f"{ts},{sym},{score}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticks", help="Path to newline CSV ticks with ts,symbol,price,volume", default=None)
    parser.add_argument("--model-engine", help="Path to TRT engine file (optional)", default=None)
    args = parser.parse_args()
    model = None
    if args.model_engine:
        if has_tensorrt():
            model = TRTEngine(args.model_engine).infer
        else:
            logger.warning("TensorRT missing: will use stub model")
    run_replay(args.ticks, model)
