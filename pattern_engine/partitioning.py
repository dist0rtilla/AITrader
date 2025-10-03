import csv
import hashlib
from typing import Dict, List, Tuple


def load_symbol_weights(path: str) -> Dict[str, float]:
    weights: Dict[str, float] = {}
    if not path:
        return weights
    try:
        with open(path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                sym = (row.get('symbol') or '').strip().upper()
                w = float(row.get('weight') or 0.0)
                if sym:
                    weights[sym] = max(0.0, w)
    except Exception:
        return {}
    return weights


def hash_partition(symbol: str, partitions: int) -> int:
    if partitions <= 1:
        return 0
    h = int(hashlib.md5(symbol.encode('utf-8')).hexdigest(), 16)
    return h % partitions


def bin_pack_symbols(symbols: List[str], weights: Dict[str, float], partitions: int) -> List[List[str]]:
    """Greedy bin packing: sort symbols by descending weight, place into lightest bin."""
    if partitions <= 1:
        return [symbols]
    bins: List[List[str]] = [[] for _ in range(partitions)]
    bin_weights: List[float] = [0.0 for _ in range(partitions)]
    for sym in sorted(symbols, key=lambda s: weights.get(s, 1.0), reverse=True):
        idx = min(range(partitions), key=lambda i: bin_weights[i])
        bins[idx].append(sym)
        bin_weights[idx] += max(0.0001, weights.get(sym, 1.0))
    return bins


def select_partition_symbols(all_symbols: List[str], weights: Dict[str, float], partitions: int, index: int, hot_symbols: List[str]) -> List[str]:
    symbols = [s.upper() for s in all_symbols]
    # Place hot symbols first to spread them
    hot = [s for s in hot_symbols if s in symbols]
    rest = [s for s in symbols if s not in hot]
    bins = bin_pack_symbols(hot + rest, weights, partitions)
    return bins[index] if 0 <= index < partitions else symbols

