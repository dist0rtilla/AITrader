"""Compute rolling expectancy/Shapre-like metrics per strategy and update `leaderboard`.

This script queries filled executions with entry_price in context, computes PnL, WinRate,
AvgWin/AvgLoss, Expectancy, StdDev, and a normalized score = expectancy / (std + eps).
It then updates the `leaderboard` row for the strategy with wins/losses and score.

Usage:
  PYTHONPATH=. python3 scripts/compute_leaderboard_metrics.py
"""
import math
from collections import defaultdict
from statistics import mean, pstdev
from backend.core.db import SessionLocal
from backend.models import Execution, Leaderboard

EPS = 1e-9


def compute_metrics(pnls):
    if not pnls:
        return None
    wins = [p for p in pnls if p > 0]
    losses = [abs(p) for p in pnls if p <= 0]
    win_rate = len(wins) / len(pnls)
    avg_win = mean(wins) if wins else 0.0
    avg_loss = mean(losses) if losses else 0.0
    expectancy = win_rate * avg_win - (1 - win_rate) * avg_loss
    volatility = pstdev(pnls) if len(pnls) > 1 else (abs(pnls[0]) if pnls else 0.0)
    sharpe_like = (mean(pnls) / (volatility + EPS)) if volatility > 0 else 0.0
    # normalized score: expectancy / volatility
    score = expectancy / (volatility + EPS)
    return {
        'n': len(pnls),
        'wins': len(wins),
        'losses': len(losses),
        'avg_win': avg_win,
        'avg_loss': avg_loss,
        'expectancy': expectancy,
        'volatility': volatility,
        'sharpe_like': sharpe_like,
        'score': score,
    }


def main():
    db = SessionLocal()
    try:
        # collect executions grouped by strategy_id
        rows = db.query(Execution).filter(Execution.status == 'filled').all()
        groups = defaultdict(list)
        for r in rows:
            # try to extract entry_price from context
            entry_price = None
            try:
                if r.context and isinstance(r.context, dict):
                    entry_price = r.context.get('entry_price')
            except Exception:
                entry_price = None
            if entry_price is None or r.price is None:
                continue
            # compute pnl: for BUY pnl = price - entry; for SELL reverse
            pnl = (r.price - float(entry_price)) if r.side == 'BUY' else (float(entry_price) - r.price)
            groups[r.strategy_id].append(pnl)

        # update leaderboard rows
        for strategy_id, pnls in groups.items():
            metrics = compute_metrics(pnls)
            if metrics is None:
                continue
            lb = db.query(Leaderboard).filter(Leaderboard.strategy_id == strategy_id).first()
            if not lb:
                lb = Leaderboard(id=str(metrics['n']) + '_' + (strategy_id or 'global'), strategy_id=strategy_id, strategy_name=strategy_id)
                db.add(lb)
            lb.orders_placed = lb.orders_placed or 0
            lb.orders_failed = lb.orders_failed or 0
            lb.wins = metrics['wins']
            lb.losses = metrics['losses']
            lb.score = float(metrics['score'])
            db.commit()
            print('Updated leaderboard for', strategy_id, 'n=', metrics['n'], 'score=', metrics['score'])
    finally:
        db.close()


if __name__ == '__main__':
    main()
