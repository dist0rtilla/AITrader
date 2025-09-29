import time
from pattern_engine.pattern_detector import PatternDetector


def test_symbolstate_signal_generation():
    # Create a detector and symbol state, feed a simple sequence that should not crash
    det = PatternDetector()
    s = det.SymbolState('TEST')
    now = time.time()
    # warm up with steady prices to initialize indicators
    for i in range(10):
        sig = s.update_and_detect(100.0 + i * 0.01, 1000, now + i)
        assert sig is None or isinstance(sig, dict)

    # Add a volume spike to attempt signal generation
    sig2 = s.update_and_detect(101.0, 5000, now + 20)
    # signal may or may not be generated depending on thresholds — ensure no exceptions and type
    assert sig2 is None or isinstance(sig2, dict)
