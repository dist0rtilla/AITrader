#!/usr/bin/env python3
"""Smoke test: publish a sample tick and wait for a signal on Redis.

This script is intentionally small and has a short timeout. It helps validate
the pipeline plumbing: tick -> native pattern engine -> strategy -> order.
"""
import os
import time
import json

import redis


REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')


def publish_tick(r):
    tick = {"symbol": "INFY", "price": 100.0, "ts": time.time()}
    r.publish('ticks', json.dumps(tick))
    print('published tick')


def wait_for_signal(r, timeout=5.0):
    ps = r.pubsub(ignore_subscribe_messages=True)
    ps.subscribe('signals')
    start = time.time()
    print('waiting for signal...')
    while time.time() - start < timeout:
        msg = ps.get_message(timeout=0.5)
        if msg and 'data' in msg:
            try:
                data = json.loads(msg['data'])
            except Exception:
                data = msg['data']
            print('received signal:', data)
            return True
    print('no signal received within timeout')
    return False


def main():
    r = redis.from_url(REDIS_URL, decode_responses=True)
    try:
        r.ping()
    except Exception as e:
        print('Redis not reachable at', REDIS_URL, '->', e)
        raise SystemExit(2)

    publish_tick(r)
    ok = wait_for_signal(r, timeout=5.0)
    raise SystemExit(0 if ok else 1)


if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""Smoke test: publish a sample tick and wait for a signal on Redis.

This script is intentionally small and has a short timeout. It helps validate
the pipeline plumbing: tick -> native pattern engine -> strategy -> order.
"""
import os
import time
import json

import redis


REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')


def publish_tick(r):
    tick = {"symbol": "INFY", "price": 100.0, "ts": time.time()}
    r.publish('ticks', json.dumps(tick))
    print('published tick')


def wait_for_signal(r, timeout=5.0):
    ps = r.pubsub(ignore_subscribe_messages=True)
    ps.subscribe('signals')
    start = time.time()
    print('waiting for signal...')
    while time.time() - start < timeout:
        msg = ps.get_message(timeout=0.5)
        if msg and 'data' in msg:
            try:
                data = json.loads(msg['data'])
            except Exception:
                data = msg['data']
            print('received signal:', data)
            return True
    print('no signal received within timeout')
    return False


def main():
    r = redis.from_url(REDIS_URL, decode_responses=True)
    try:
        r.ping()
    except Exception as e:
        print('Redis not reachable at', REDIS_URL, '->', e)
        raise SystemExit(2)

    publish_tick(r)
    ok = wait_for_signal(r, timeout=5.0)
    raise SystemExit(0 if ok else 1)


if __name__ == '__main__':
    main()
