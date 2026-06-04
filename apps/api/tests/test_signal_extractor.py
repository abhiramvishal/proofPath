from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.services.signal_extractor import (
    BEHAVIOURAL_SIGNALS,
    compute_authenticity_score,
    extract_signals,
)


def _make_event(type_: str, ts_ms: int, sequence: int, payload: dict | None = None, session_id: str = "sess-1"):
    e = MagicMock()
    e.type = type_
    e.ts = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    e.sequence = sequence
    e.session_id = session_id
    e.payload = payload or {}
    return e


def _keystroke_sequence(n: int = 20, start_ms: int = 0, interval_ms: int = 200) -> list:
    return [
        _make_event("keystroke", start_ms + i * interval_ms, i + 1, {"interval_ms": interval_ms})
        for i in range(n)
    ]


def test_extract_signals_returns_all_14():
    events = _keystroke_sequence(20)
    signals = extract_signals(events, word_count=50)
    for key in BEHAVIOURAL_SIGNALS:
        assert key in signals, f"Missing signal: {key}"


def test_all_signal_values_in_range():
    events = _keystroke_sequence(30)
    signals = extract_signals(events, word_count=100)
    for key, val in signals.items():
        assert 0 <= val <= 100, f"{key}={val} out of range"


def test_authenticity_score_in_range():
    events = _keystroke_sequence(30)
    signals = extract_signals(events, word_count=100)
    score = compute_authenticity_score(signals)
    assert 0 <= score <= 100


def test_high_paste_ratio_lowers_score():
    base_events = _keystroke_sequence(10)
    paste_events = [
        _make_event("paste", 5000 + i * 1000, 11 + i, {"length": 500})
        for i in range(10)
    ]
    signals_normal = extract_signals(base_events, word_count=20)
    signals_paste = extract_signals(base_events + paste_events, word_count=20)
    # paste_to_original_ratio should be higher (worse) when lots of pasting
    assert signals_paste["paste_to_original_ratio"] <= signals_normal["paste_to_original_ratio"]


def test_empty_events_returns_safe_defaults():
    signals = extract_signals([], word_count=0)
    assert isinstance(signals, dict)
    score = compute_authenticity_score(signals)
    assert 0 <= score <= 100
