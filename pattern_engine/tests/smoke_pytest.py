import os
import tempfile
import textwrap
import time
import json
import uuid

import pytest


def test_run_replay_publish_smoke():
    """Smoke test: import the pyo3 extension and call run_replay_publish.

    Builds in CI will install the pyo3 wheel. This test creates a tiny CSV,
    calls the pyo3 `run_replay_publish` function and, if REDIS_URL is provided,
    verifies that at least one tick message was written to the configured
    ticks stream.
    """

    redis_url = os.environ.get("REDIS_URL")

    # Unique test streams to avoid cross-job interference
    suffix = uuid.uuid4().hex[:8]
    signals_stream = os.environ.get("SIGNALS_STREAM", f"signals:test-{suffix}")
    ticks_stream = os.environ.get("TICKS_STREAM", f"ticks:test-{suffix}")

    os.environ["SIGNALS_STREAM"] = signals_stream
    os.environ["TICKS_STREAM"] = ticks_stream

    csv_content = textwrap.dedent("""
    symbol, price, volume, timestamp
    TEST, 100.0, 1, 2025-09-29T00:00:00Z
    TEST, 100.5, 2, 2025-09-29T00:00:01Z
    """)

    with tempfile.NamedTemporaryFile(mode="w+", suffix=".csv") as fh:
        fh.write(csv_content)
        fh.flush()

        try:
            import pattern_engine_pyo3 as pe_pyo3
        except Exception as e:
            pytest.skip(f"pyo3 extension not available: {e}")

        rc = pe_pyo3.run_replay_publish(fh.name, redis_url)
        assert isinstance(rc, int)

        if not redis_url:
            return

        try:
            import redis
        except Exception as e:
            pytest.skip(f"redis-py not available for integration check: {e}")

        client = redis.Redis.from_url(redis_url, decode_responses=True)

        found = False
        deadline = time.time() + 3.0
        while time.time() < deadline:
            try:
                entries = client.xrange(ticks_stream, min='-', max='+', count=5)
            except Exception:
                entries = []

            if entries:
                found = True
                entry_id, fields = entries[0]
                data_raw = fields.get('data') or fields.get(b'data')
                try:
                    payload = json.loads(data_raw)
                except Exception:
                    payload = None

                assert isinstance(payload, dict)
                assert 'symbol' in payload
                assert 'price' in payload
                assert 'volume' in payload
                assert 'timestamp' in payload
                break

        assert found, f"No messages found on Redis stream {ticks_stream} (REDIS_URL={redis_url})"

        # cleanup streams
        try:
            client.xtrim(signals_stream, maxlen=0, approximate=False)
        except Exception:
            try:
                client.delete(signals_stream)
            except Exception:
                pass

        try:
            client.xtrim(ticks_stream, maxlen=0, approximate=False)
        except Exception:
            try:
                client.delete(ticks_stream)
            except Exception:
                pass
