#!/usr/bin/env python3
"""Download recent NSE price data and build feature dataset.

This script downloads intraday price data (via yfinance) for the provided symbols
and computes common technical indicators into a single dataset ready for training.

Usage:
  python3 scripts/build_nse_dataset.py --symbols 'TCS.NS,LT.NS' --days 5 --interval 1m --out data/nse_midcap/features.parquet

Notes:
- Provide symbols as comma-separated tickers (with .NS suffix) or a file with one ticker per line via --symbols-file.
- yfinance supports 1m interval for up to 7 days history. If 1m is not available, try 5m.
- The script computes: mid, sma5/10/20, ema12/26, rsi14, atr14, bollinger(20), vol20

"""
import argparse
import os
import sys
from datetime import datetime, timedelta

try:
    import pandas as pd
    import numpy as np
    import yfinance as yf
except Exception as e:
    print('Missing dependency:', e)
    print('Install with: pip install pandas numpy yfinance')
    sys.exit(1)


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    # expects df with columns: Open, High, Low, Close, Volume
    df = df.copy()
    df['mid'] = (df['High'] + df['Low']) / 2.0
    # SMA
    df['sma5'] = df['mid'].rolling(5, min_periods=1).mean()
    df['sma10'] = df['mid'].rolling(10, min_periods=1).mean()
    df['sma20'] = df['mid'].rolling(20, min_periods=1).mean()
    # EMA
    df['ema12'] = df['mid'].ewm(span=12, adjust=False).mean()
    df['ema26'] = df['mid'].ewm(span=26, adjust=False).mean()
    # returns
    df['ret1'] = df['mid'].pct_change(1)
    df['ret5'] = df['mid'].pct_change(5)
    # vol (rolling std of returns)
    df['vol20'] = df['ret1'].rolling(20, min_periods=1).std()
    # Bollinger
    df['boll_mid'] = df['sma20']
    df['boll_std'] = df['mid'].rolling(20, min_periods=1).std()
    df['boll_upper'] = df['boll_mid'] + 2 * df['boll_std']
    df['boll_lower'] = df['boll_mid'] - 2 * df['boll_std']
    # RSI (Wilder) implementation
    delta = df['mid'].diff()
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    roll_up = up.ewm(alpha=1/14, adjust=False).mean()
    roll_down = down.ewm(alpha=1/14, adjust=False).mean()
    rs = roll_up / (roll_down + 1e-12)
    df['rsi14'] = 100 - (100 / (1 + rs))
    # ATR
    high_low = df['High'] - df['Low']
    high_prevclose = (df['High'] - df['Close'].shift(1)).abs()
    low_prevclose = (df['Low'] - df['Close'].shift(1)).abs()
    tr = pd.concat([high_low, high_prevclose, low_prevclose], axis=1).max(axis=1)
    df['atr14'] = tr.rolling(14, min_periods=1).mean()

    return df


def download_and_process(symbol: str, period_days: int, interval: str) -> pd.DataFrame:
    # yfinance period parameter like '5d'
    period = f"{period_days}d"
    print('Downloading', symbol, 'period', period, 'interval', interval)
    # use yf.download (returns OHLCV dataframe indexed by datetime)
    df = yf.download(tickers=symbol, period=period, interval=interval, progress=False, threads=True)
    if df is None or df.empty:
        print('No data for', symbol)
        return pd.DataFrame()

    # yfinance may return a MultiIndex columns (Price, Ticker) even for single ticker downloads.
    # Flatten to single-level column names like 'Open','High','Low','Close','Volume'
    if isinstance(df.columns, pd.MultiIndex):
        try:
            # take the first level (Price) so columns become Close, High, Low, Open, Volume
            df.columns = df.columns.get_level_values(0)
        except Exception:
            # as a fallback, rename known patterns
            df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]

    # ensure columns exist and casing matches expectations
    expected = {'Open', 'High', 'Low', 'Close', 'Volume'}
    if not expected.issubset(set(df.columns)):
        print('Missing expected OHLCV columns for', symbol, 'got:', list(df.columns))
        return pd.DataFrame()

    df = compute_indicators(df)
    df['symbol'] = symbol
    # drop rows without mid
    df = df.dropna(subset=['mid'])
    return df


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--symbols', default='')
    p.add_argument('--symbols-file', default='')
    p.add_argument('--days', type=int, default=5)
    p.add_argument('--interval', default='1m')
    p.add_argument('--out', default='data/nse_midcap/features.parquet')
    args = p.parse_args()

    symbols = []
    if args.symbols:
        symbols = [s.strip() for s in args.symbols.split(',') if s.strip()]
    if args.symbols_file:
        with open(args.symbols_file, 'r') as fh:
            for l in fh:
                s = l.strip()
                if s:
                    symbols.append(s)
    if not symbols:
        print('No symbols provided. Provide --symbols or --symbols-file with .NS tickers (e.g. "MUTHOOTFIN.NS").')
        sys.exit(2)

    all_dfs = []
    for sym in symbols:
        df = download_and_process(sym, args.days, args.interval)
        if not df.empty:
            all_dfs.append(df)

    if not all_dfs:
        print('No data downloaded for any symbol')
        sys.exit(1)

    out_df = pd.concat(all_dfs, axis=0)
    out_dir = os.path.dirname(args.out) or '.'
    os.makedirs(out_dir, exist_ok=True)
    try:
        out_df.to_parquet(args.out)
        print('Wrote', args.out)
    except Exception:
        out_df.to_csv(args.out.replace('.parquet', '.csv'))
        print('Wrote CSV fallback')


if __name__ == '__main__':
    main()
