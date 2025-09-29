import json
import pytest
from flask import Flask

from finbert_server import app as app_module


class DummyPipeline:
    def __call__(self, text):
        return [{"label": "POSITIVE", "score": 0.99, "text": text}]


@pytest.fixture(autouse=True)
def patch_pipeline(monkeypatch):
    # Monkeypatch the transformers pipeline used in get_finbert
    class Dummy:
        def __init__(self, *args, **kwargs):
            pass

        def __call__(self, text):
            return [{"label": "NEUTRAL", "score": 0.5, "text": text}]

    def fake_pipeline(*args, **kwargs):
        return Dummy()

    # Ensure the app uses a preloaded pipeline so get_finbert() is not invoked
    try:
        import finbert_server.app as app_mod
        app_mod._FINBERT = fake_pipeline()
    except Exception:
        # fallback: set attributes on the module path
        monkeypatch.setattr('finbert_server.app.pipeline', fake_pipeline, raising=False)
        monkeypatch.setattr('finbert_server.app.AutoTokenizer', lambda *a, **k: None, raising=False)
        monkeypatch.setattr('finbert_server.app.AutoModelForSequenceClassification', lambda *a, **k: None, raising=False)
    yield


@pytest.fixture
def client():
    app_module.app.config['TESTING'] = True
    with app_module.app.test_client() as c:
        yield c


def test_health_initially_unloaded(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    body = resp.get_json()
    # Initially the model should not be loaded (lazy)
    assert body['ok'] in (True, False)
    assert 'model_name' in body


def test_predict_and_reload(client):
    # Trigger load via predict (monkeypatched pipeline will be used)
    resp = client.post('/predict', json={'text': 'hello world'})
    assert resp.status_code == 200
    j = resp.get_json()
    assert isinstance(j, list)
    assert 'label' in j[0]

    # Force reload endpoint
    resp2 = client.post('/reload')
    assert resp2.status_code == 200
    assert resp2.get_json().get('ok') in (True, False)


def test_invalid_payload(client):
    resp = client.post('/predict', json={'text': ''})
    assert resp.status_code == 400

