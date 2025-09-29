pattern_engine_pyo3
=====================

Minimal pyo3 wrapper exposing the Rust `pattern_engine` binary as a Python-callable function.

Build
-----

From the `pattern_engine/pyo3_wrapper` directory:

1. Install maturin or use cargo to build a cdylib. Example with maturin:

    maturin develop --release

2. Alternatively build with cargo and place the binary on PATH or set `RUST_PATTERN_ENGINE_BIN`.

Usage
-----

From Python:

    import pattern_engine_pyo3
    # Simple line-count replay
    rc = pattern_engine_pyo3.run_replay('/path/to/ticks.csv')

    # Richer replay that publishes ticks to Redis
    # redis_url example: 'redis://localhost:6379/0'
    processed = pattern_engine_pyo3.run_replay_publish('/path/to/ticks.csv', 'redis://localhost:6379/0')

The `run_replay_publish` function returns the number of processed ticks (int) and
will create a `Publisher` internally if a `redis_url` is provided. Errors are
raised as Python RuntimeError.

Local development / CI
----------------------

To build and install the pyo3 extension into your active Python environment:

```bash
cd pattern_engine/pyo3_wrapper
maturin develop --release
```

The repository includes a GitHub Actions workflow `.github/workflows/pyo3-build-smoke.yml` which builds the extension and runs a small Python smoke test that calls `run_replay_publish` against a Redis service. Use that workflow as a reference when reproducing CI locally.
