from strategy_engine.app import compute_weighted_decision, Signal, Sentiment


def test_buy_decision():
    signals = [Signal(symbol='XYZ', score=0.9)]
    decs = compute_weighted_decision(signals)
    assert len(decs) == 1
    assert decs[0].action == 'buy'


def test_sell_decision():
    signals = [Signal(symbol='XYZ', score=-0.9)]
    decs = compute_weighted_decision(signals)
    assert len(decs) == 1
    assert decs[0].action == 'sell'


def test_hold_decision():
    signals = [Signal(symbol='XYZ', score=0.0)]
    decs = compute_weighted_decision(signals)
    assert len(decs) == 1
    assert decs[0].action == 'hold'


def test_sentiment_scaling_with_authenticity():
    signals = [Signal(symbol='XYZ', score=0.1)]
    sentiment = [Sentiment(symbol='XYZ', sentiment_score=1.0, authenticity_score=0.0)]
    decs = compute_weighted_decision(signals, sentiment)
    # authenticity 0.0 should remove sentiment influence; combined=pattern*0.6=0.06 -> hold
    assert decs[0].action == 'hold'


def test_weight_override():
    signals = [Signal(symbol='XYZ', score=0.1)]
    sentiment = [Sentiment(symbol='XYZ', sentiment_score=1.0, authenticity_score=1.0)]
    decs = compute_weighted_decision(signals, sentiment, weights={'pattern': 0.1, 'sentiment':0.8, 'strategy':0.1})
    # combined = 0.1*0.1 + 0.8*(1.0*1.0) = 0.01 + 0.8 = 0.81 -> buy
    assert decs[0].action == 'buy'
