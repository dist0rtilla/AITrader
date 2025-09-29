import pytest
import os
import time
from finbert_server import app as app_module

pytestmark = pytest.mark.integration


def test_predict_integration(tmp_path):
    # This test intentionally uses the real transformers pipeline and may download
    # model weights. It's marked as 'integration' and should only run in the
    # dedicated integration workflow or locally by request.
    cache_dir = tmp_path / 'hf_cache'
    os.environ['TRANSFORMERS_CACHE'] = str(cache_dir)

    # Ensure we reload the model in case previous tests modified state
    app_module._FINBERT = None

    app_module.app.config['TESTING'] = True
    with app_module.app.test_client() as client:
        # Trigger a real model load (may take time while downloading)
        resp = client.post('/predict', json={'text': 'Stocks rallied after the earnings beat'})
        assert resp.status_code == 200
        j = resp.get_json()
        assert isinstance(j, list)
        assert 'label' in j[0]
        assert 'score' in j[0]

*** End Patch