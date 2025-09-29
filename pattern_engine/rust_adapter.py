"""Adapter to choose between Rust hot-path and Python pattern engine.

This module provides a small compatibility layer so the rest of the Python
codebase can prefer a Rust hot-path when available (pyo3 extension or a
separate Rust binary) but gracefully fall back to the pure-Python runner.

It intentionally keeps the interface minimal: a `replay` function that will
run a tick CSV through the preferred backend and return the output lines.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import logging
from typing import Iterable, Optional

logger = logging.getLogger(__name__)

_RUST_BINARY_ENV = "RUST_PATTERN_ENGINE_BIN"


def _find_rust_binary() -> Optional[str]:
    # 1) explicit env override
    path = os.environ.get(_RUST_BINARY_ENV)
    if path:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
        return None

    # 2) default build locations
    candidates = [
        os.path.join(os.path.dirname(__file__), "../target/debug/pattern_engine"),
        os.path.join(os.path.dirname(__file__), "../target/release/pattern_engine"),
        os.path.join(os.path.dirname(__file__), "pattern_engine"),
    ]
    for c in candidates:
        c = os.path.abspath(c)
        if os.path.isfile(c) and os.access(c, os.X_OK):
            return c

    # 3) on PATH
    p = shutil.which("pattern_engine")
    if p:
        return p
    return None


def has_rust_extension() -> bool:
    """Return True if a pyo3-based native extension is importable.

    We try common names but projects vary; keep this conservative.
    """
    for mod in ("pattern_engine_native", "pattern_engine_rust", "pattern_engine_trt"):
        try:
            __import__(mod)
            logger.debug("Found rust extension module: %s", mod)
            return True
        except Exception:
            continue
    return False


def has_rust_binary() -> bool:
    return _find_rust_binary() is not None


def replay_with_rust_binary(ticks_csv: Optional[str]) -> Iterable[str]:
    """Run the Rust binary replay CLI and yield stdout lines.

    This expects the Rust binary to accept --ticks <path> similar to the
    Python runner. If you built a different CLI, set `RUST_PATTERN_ENGINE_BIN`
    to the correct executable and ensure compatible args.
    """
    bin_path = _find_rust_binary()
    if not bin_path:
        raise RuntimeError("Rust binary not found")
    cmd = [bin_path]
    if ticks_csv:
        cmd += ["--ticks", ticks_csv]
    logger.info("Running Rust pattern engine binary: %s", cmd)
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    assert proc.stdout is not None
    for line in proc.stdout:
        yield line.rstrip("\n")
    rc = proc.wait()
    if rc != 0:
        stderr = proc.stderr.read() if proc.stderr is not None else ""
        raise RuntimeError(f"Rust binary exited {rc}: {stderr}")


def replay(ticks_csv: Optional[str] = None, prefer_rust: bool = True) -> Iterable[str]:
    """Replay ticks through the preferred backend.

    If `prefer_rust` is True this will try, in order:
      1. pyo3 Rust extension import (not implemented here, but detected),
      2. Rust binary (CLI),
      3. Python `pattern_engine.runner.run_replay` fallback.

    It yields the lines produced by the selected backend for easy piping.
    """
    # 1) pyo3 extension (not implemented directly — detect only)
    if prefer_rust and has_rust_extension():
        # If a pyo3 extension is available we assume it exposes a `run_replay`
        # function compatible with the Python wrapper. Import and delegate.
        try:
            mod = __import__("pattern_engine_native")
        except Exception:
            try:
                mod = __import__("pattern_engine_rust")
            except Exception:
                mod = None
        if mod is not None and hasattr(mod, "run_replay"):
            for out in mod.run_replay(ticks_csv):
                yield out
            return

    # 2) Rust binary
    if prefer_rust and has_rust_binary():
        for ln in replay_with_rust_binary(ticks_csv):
            yield ln
        return

    # 3) Python fallback
    from pattern_engine.runner import run_replay

    # run_replay prints to stdout; capture by running it and yielding print lines
    # We'll call it directly but capture printed output using subprocess is heavier.
    # Simpler: run it in a subprocess invoking python -m pattern_engine.runner
    cmd = [shutil.which("python3") or shutil.which("python") or "python", "-m", "pattern_engine.runner"]
    if ticks_csv:
        cmd += ["--ticks", ticks_csv]
    logger.info("Running Python runner: %s", cmd)
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    assert proc.stdout is not None
    for line in proc.stdout:
        yield line.rstrip("\n")
    rc = proc.wait()
    if rc != 0:
        stderr = proc.stderr.read() if proc.stderr is not None else ""
        raise RuntimeError(f"Python runner exited {rc}: {stderr}")
