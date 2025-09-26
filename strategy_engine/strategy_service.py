"""Simple strategy engine that subscribes to 'signals', maintains indicators via a low-latency
Calculator, consults MCP (mock) and enqueues simulated orders to 'orders' channel.

This replaces the previous `IndicatorStore` with the faster `Calculator` in
`strategy_engine/calculator.py` for hot-path usage.
"""
import redis
import os
import ast
import requests
import uuid

from strategy_engine.calculator import get_calculator
from backend.core.db import SessionLocal
from backend.models import Execution, Leaderboard, Reward

REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
SIG_CH = 'signals'
ORD_CH = 'orders'
TICK_CH = 'ticks'
FILL_CH = 'fills'
MCP_URL = os.environ.get('MCP_URL', 'http://mock-mcp:9000')

r = redis.from_url(REDIS_URL, decode_responses=True)

calculator = get_calculator()

REWARD_SCALE = float(os.environ.get('REWARD_SCALE', '1.0'))
LOSS_MULTIPLIER = float(os.environ.get('LOSS_MULTIPLIER', '3.0'))


def _increment_leaderboard(strategy_id: str, strategy_name: str, field: str, delta: int = 1):
    try:
        db = SessionLocal()
        lb = db.query(Leaderboard).filter(Leaderboard.strategy_id == strategy_id).first()
        if not lb:
            lb = Leaderboard(id=str(uuid.uuid4()), strategy_id=strategy_id, strategy_name=strategy_name)
            db.add(lb)
        if hasattr(lb, field):
            cur = getattr(lb, field) or 0
            setattr(lb, field, cur + delta)
        db.commit()
    except Exception as e:
        print('Leaderboard update failed:', e)
    finally:
        try:
            db.close()
        except Exception:
            pass


def _award_reward(strategy_id: str, amount: float, reason: str, meta: dict = None):
    try:
        db = SessionLocal()
        rwd = Reward(id=str(uuid.uuid4()), strategy_id=strategy_id, amount=amount, reason=reason, meta=meta or {})
        db.add(rwd)
        db.commit()
        print('awarded reward', rwd.id, 'amt', amount)
    except Exception as e:
        print('Failed to award reward:', e)
    finally:
        try:
            db.close()
        except Exception:
            pass


def decide_and_order(signal):
    sym = signal['symbol']
    # basic enhancement: consult recent SMA(20) and RSI(14) if available
    sma20 = calculator.sma(sym, 20)
    rsi14 = calculator.rsi(sym, 14)

    reason = signal.get('signal', 'signal')
    # naive decision: if wide_spread, submit small market buy order, but avoid if RSI>70
    if reason == 'wide_spread' and (rsi14 is None or rsi14 < 70):
        order = {'symbol': sym, 'side': 'BUY', 'qty': 1, 'type': 'MARKET', 'reason': reason}
        # create DB record first so decision is persisted even if publish fails
        order_id = str(uuid.uuid4())
        order['id'] = order_id
        db = None
        try:
            db = SessionLocal()
            # snapshot entry price from calculator if available
            entry_price = None
            try:
                entry_price = calculator._states[sym]._last_price if calculator and sym in calculator._states else None
            except Exception:
                entry_price = None
            exec_rec = Execution(
                id=order_id,
                strategy_id=None,
                symbol=sym,
                side='BUY',
                qty=1.0,
                price=None,
                status='pending',
                reason=reason,
                context={'sma20': sma20, 'rsi14': rsi14, 'entry_price': entry_price}
            )
            db.add(exec_rec)
            db.commit()
            print('persisted execution', order_id)
        except Exception as e:
            print('DB write failed:', e)
        finally:
            if db:
                try:
                    db.close()
                except Exception:
                    pass

        # attempt to publish order (best-effort). Include order id so downstream can reconcile.
        try:
            r.publish(ORD_CH, str(order))
            print('published order', order)
            # record success in leaderboard
            try:
                _increment_leaderboard(None, 'local_strategy', 'orders_placed', 1)
            except Exception as e:
                print('failed to update leaderboard on publish success:', e)
        except Exception as e:
            # publishing failed; keep execution record as pending and log failure
            print('Redis publish failed:', e)
            # increment leaderboard failed counter
            try:
                _increment_leaderboard(None, 'local_strategy', 'orders_failed', 1)
            except Exception as ee:
                print('failed to update leaderboard on publish failure:', ee)
            try:
                db = SessionLocal()
                rec = db.query(Execution).get(order_id)
                if rec:
                    rec.status = 'publish_failed'
                    db.commit()
            except Exception as ex:
                print('Failed to update execution after publish failure:', ex)
            finally:
                if db:
                    try:
                        db.close()
                    except Exception:
                        pass
    else:
        print('skipping order for', sym, 'rsi=', rsi14)


# subscribe to fills in main loop; add handler to process fills

def process_fill(fill: dict):
    # update execution record and leaderboard/rewards
    order_id = fill.get('order_id')
    price = float(fill.get('price', 0.0))
    symbol = fill.get('symbol')
    side = fill.get('side')
    qty = float(fill.get('qty', 0.0))
    try:
        db = SessionLocal()
        if order_id:
            rec = db.query(Execution).get(order_id)
            if rec:
                rec.status = 'filled'
                rec.price = price
                db.commit()
                # realistic reward calculation if entry price present
                entry_price = None
                try:
                    entry_price = rec.context.get('entry_price') if rec and rec.context else None
                except Exception:
                    entry_price = None
                # fallback: if no entry price, assume break-even for now
                if entry_price is not None:
                    # compute pnl for BUY (positive when exit price > entry)
                    if side == 'BUY':
                        pnl = (price - float(entry_price)) * float(qty)
                    else:
                        pnl = (float(entry_price) - price) * float(qty)
                    # measure risk via ATR if available
                    atr = calculator.atr(symbol, 14) or 1.0
                    # reward scaled by risk
                    reward_amount = (pnl / (atr + 1e-9)) * REWARD_SCALE
                    if pnl > 0:
                        _increment_leaderboard(rec.strategy_id, 'local_strategy', 'wins', 1)
                        _award_reward(rec.strategy_id, float(reward_amount), 'filled_profit', {'price': price, 'symbol': symbol, 'pnl': pnl, 'atr': atr})
                        # bump leaderboard score
                        try:
                            db = SessionLocal()
                            lb = db.query(Leaderboard).filter(Leaderboard.strategy_id == rec.strategy_id).first()
                            if lb:
                                lb.score = (lb.score or 0.0) + float(reward_amount)
                                db.commit()
                        except Exception as e:
                            print('failed to update leaderboard score:', e)
                        finally:
                            try:
                                db.close()
                            except Exception:
                                pass
                    else:
                        # heavy penalty for losses
                        penalty = abs(pnl) * LOSS_MULTIPLIER
                        _increment_leaderboard(rec.strategy_id, 'local_strategy', 'losses', 1)
                        _award_reward(rec.strategy_id, -float(penalty), 'filled_loss', {'price': price, 'symbol': symbol, 'pnl': pnl, 'atr': atr})
                        try:
                            db = SessionLocal()
                            lb = db.query(Leaderboard).filter(Leaderboard.strategy_id == rec.strategy_id).first()
                            if lb:
                                lb.score = (lb.score or 0.0) - float(penalty)
                                db.commit()
                        except Exception as e:
                            print('failed to update leaderboard score after loss:', e)
                        finally:
                            try:
                                db.close()
                            except Exception:
                                pass
                else:
                    # unknown entry price — record as neutral fill
                    _increment_leaderboard(rec.strategy_id, 'local_strategy', 'wins' if price>0 else 'losses', 0)
        else:
            # no order id — create a record
            rec = Execution(id=str(uuid.uuid4()), strategy_id=None, symbol=symbol, side=side, qty=qty, price=price, status='filled', reason='simulated', context={})
            db.add(rec)
            db.commit()
    except Exception as e:
        print('Failed to process fill DB update:', e)
    finally:
        try:
            db.close()
        except Exception:
            pass


# integrate into main loop by subscribing to fills
# add t_ps for ticks and f_ps for fills

if __name__ == '__main__':
    ps = r.pubsub()
    ps.subscribe(SIG_CH)
    # also subscribe to ticks to keep indicators up to date
    t_ps = r.pubsub()
    t_ps.subscribe(TICK_CH)
    f_ps = r.pubsub()
    f_ps.subscribe(FILL_CH)

    print('Strategy engine listening for signals, ticks and fills')

    # main loop: poll all three
    while True:
        m = ps.get_message(timeout=0.01)
        if m and m.get('type') == 'message':
            s = ast.literal_eval(m['data'])
            decide_and_order(s)

        t = t_ps.get_message(timeout=0.01)
        if t and t.get('type') == 'message':
            try:
                tk = ast.literal_eval(t['data'])
            except Exception:
                try:
                    import json

                    tk = json.loads(t['data'])
                except Exception:
                    tk = None
            if tk:
                # update the fast calculator state for this tick
                calculator.update(tk)

        f = f_ps.get_message(timeout=0.01)
        if f and f.get('type') == 'message':
            try:
                fl = ast.literal_eval(f['data'])
            except Exception:
                try:
                    import json

                    fl = json.loads(f['data'])
                except Exception:
                    fl = None
            if fl:
                process_fill(fl)
