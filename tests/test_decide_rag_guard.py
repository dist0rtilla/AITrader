import os
import json
from fastapi.testclient import TestClient

from strategy_engine.app import app


client = TestClient(app)


def test_decide_rag_guard_when_missing():
    # If langchain is not installed in the test env, the endpoint should return 501
    payload = {
        "signals": [{"symbol": "AAPL", "score": 0.6}],
        "sentiment": [{"symbol": "AAPL", "sentiment_score": 0.2, "authenticity_score": 0.9}]
    }
    resp = client.post('/decide_rag', json=payload)
    assert resp.status_code in (501, 200)
    # If it's 501, body should contain helpful detail; if 200 it means langchain is present in env
    if resp.status_code == 501:
        assert 'langchain' in resp.json().get('detail', '').lower()
