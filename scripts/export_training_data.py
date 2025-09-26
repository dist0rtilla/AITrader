"""Export training dataset by joining `executions` with features from the Calculator.

This script performs a best-effort snapshot: it queries executions from the DB and
attaches current features from the in-memory `Calculator` (if available).

Usage:
  python3 scripts/export_training_data.py --out data/training.csv

Options:
  --status STATUS   Filter executions by status (default: filled)
  --out PATH        Output path (CSV). If pandas+pyarrow available also writes Parquet.
"""
import argparse
import os
import csv
from datetime import datetime

try:
    import pandas as pd
    _HAS_PANDAS = True
except Exception:
    _HAS_PANDAS = False

from backend.core.db import SessionLocal
from backend.models import Execution
from strategy_engine.calculator import get_calculator


def fetch_executions(status: str = 'filled'):
    db = SessionLocal()
    try:
        q = db.query(Execution)
        if status:
            q = q.filter(Execution.status == status)
        rows = q.order_by(Execution.created_at.asc()).all()
        return rows
    finally:
        db.close()


def row_from_exec(exec_rec, calc):
    sym = exec_rec.symbol
    # existing features
    sma20 = calc.sma(sym, 20)
    rsi14 = calc.rsi(sym, 14)
    atr14 = calc.atr(sym, 14)
    boll = calc.bollinger(sym, 20)

    # additional features for richer training set
    sma5 = calc.sma(sym, 5)
    sma10 = calc.sma(sym, 10)
    # ema exists on Calculator
    ema12 = calc.ema(sym, 12)
    ema26 = calc.ema(sym, 26)
    # estimate volatility (std) from bollinger bands if available (bollinger uses k=2 by default)
    vol20 = None
    if boll and len(boll) == 3 and boll[1] is not None:
        try:
            mid, upper, lower = boll
            # std = (upper - mid) / k  (k==2 default)
            vol20 = (upper - mid) / 2.0
        except Exception:
            vol20 = None

    return {
        'execution_id': exec_rec.id,
        'strategy_id': exec_rec.strategy_id,
        'symbol': sym,
        'side': exec_rec.side,
        'qty': exec_rec.qty,
        'price': exec_rec.price,
        'status': exec_rec.status,
        'reason': exec_rec.reason,
        'created_at': exec_rec.created_at.isoformat() if exec_rec.created_at else None,
        # existing indicators
        'sma20': sma20,
        'rsi14': rsi14,
        'atr14': atr14,
        'boll_mid': boll[0] if boll else None,
        'boll_upper': boll[1] if boll else None,
        'boll_lower': boll[2] if boll else None,
        # additional indicators
        'sma5': sma5,
        'sma10': sma10,
        'ema12': ema12,
        'ema26': ema26,
        'vol20': vol20,
    }


def write_out(rows, out_path):
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    if _HAS_PANDAS:
        df = pd.DataFrame(rows)
        df.to_csv(out_path, index=False)
        try:
            pq_path = os.path.splitext(out_path)[0] + '.parquet'
            df.to_parquet(pq_path)
            print('Wrote', out_path, 'and', pq_path)
            return
        except Exception:
            pass
    # fallback to csv
    if rows:
        keys = list(rows[0].keys())
    else:
        keys = []
    with open(out_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
    print('Wrote', out_path)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--status', default='filled')
    p.add_argument('--out', default='data/training.csv')
    args = p.parse_args()

    calc = get_calculator()
    executions = fetch_executions(status=args.status)
    rows = []
    for ex in executions:
        rows.append(row_from_exec(ex, calc))

    write_out(rows, args.out)


if __name__ == '__main__':
    main()
