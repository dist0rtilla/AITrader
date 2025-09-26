from sentiment_engine.app import check_authenticity, TRUSTED_SOURCES


def test_trusted_source_boost():
    txt = "Breaking: company reports revenue beat."
    auth = check_authenticity(txt, source='Reuters')
    assert auth > 0.3


def test_social_media_penalty():
    txt = "short tweet"
    auth = check_authenticity(txt, source='twitter.com')
    assert auth < 0.2


def test_trusted_list_contains_reuters():
    assert any('reuters' in s for s in TRUSTED_SOURCES)
