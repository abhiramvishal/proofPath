"""Behavioural signal extraction — 14 signals per ProofPath documentation §8."""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime

from app.models import Event

BEHAVIOURAL_SIGNALS = [
    "typing_speed_consistency",
    "pause_before_content_ratio",
    "revision_depth_score",
    "paste_to_original_ratio",
    "session_distribution_entropy",
    "edit_directionality",
    "burst_pause_regularity",
    "cross_session_consistency",
    "ai_insertion_ratio",
    "ai_query_complexity",
    "first_session_volume",
    "deletion_pattern",
    "thinking_pause_distribution",
    "time_to_first_word",
]

SIGNAL_WEIGHTS = {s: 1 / len(BEHAVIOURAL_SIGNALS) for s in BEHAVIOURAL_SIGNALS}


def _clamp(score: float) -> int:
    return max(0, min(100, int(round(score))))


def _event_to_dict(event: Event) -> dict:
    return {
        "type": event.type,
        "ts": int(event.ts.timestamp() * 1000),
        "sequence": event.sequence,
        "session_id": str(event.session_id),
        "payload": event.payload or {},
    }


def _group_by_session(events: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        groups[e["session_id"]].append(e)
    return dict(groups)


def _typing_speed_consistency(events: list[dict]) -> int:
    keystrokes = [e for e in events if e["type"] == "keystroke"]
    if len(keystrokes) < 10:
        return 50
    intervals = [keystrokes[i]["ts"] - keystrokes[i - 1]["ts"] for i in range(1, len(keystrokes))]
    intervals = [x for x in intervals if 0 < x < 5000]
    if not intervals:
        return 50
    mean = sum(intervals) / len(intervals)
    variance = sum((x - mean) ** 2 for x in intervals) / len(intervals)
    cv = math.sqrt(variance) / mean if mean > 0 else 1
    return _clamp(100 - cv * 50)


def _pause_before_content_ratio(events: list[dict]) -> int:
    pauses = [e for e in events if e["type"] == "pause"]
    meaningful = [p for p in pauses if (p["payload"].get("duration_ms") or 0) >= 3000]
    if not meaningful:
        return 70
    before_content = sum(1 for p in meaningful if (p["payload"].get("position") or 0) > 0)
    ratio = before_content / len(meaningful)
    return _clamp(50 + ratio * 50)


def _revision_depth_score(events: list[dict]) -> int:
    deletes = [e for e in events if e["type"] == "delete"]
    keystrokes = len([e for e in events if e["type"] == "keystroke"])
    if keystrokes == 0:
        return 65
    delete_ratio = len(deletes) / keystrokes
    return _clamp(100 - delete_ratio * 200)


def _paste_to_original_ratio(events: list[dict], word_count: int) -> int:
    pastes = [e for e in events if e["type"] == "paste"]
    pasted = sum((e["payload"].get("length") or 0) for e in pastes)
    denom = max(word_count * 5, 1)
    ratio = pasted / denom
    return _clamp(100 - ratio * 100)


def _session_distribution_entropy(events: list[dict]) -> int:
    sessions = _group_by_session(events)
    if len(sessions) <= 1:
        return 60
    counts = [len(s) for s in sessions.values()]
    total = sum(counts)
    if total == 0:
        return 50
    entropy = 0.0
    for c in counts:
        p = c / total
        if p > 0:
            entropy -= p * math.log2(p)
    max_entropy = math.log2(len(counts)) if len(counts) > 1 else 1
    normalized = entropy / max_entropy if max_entropy > 0 else 0
    return _clamp(40 + normalized * 60)


def _edit_directionality(events: list[dict]) -> int:
    positions = [
        e["payload"].get("position")
        for e in events
        if e["type"] == "keystroke" and e["payload"].get("position") is not None
    ]
    if len(positions) < 5:
        return 68
    backward = sum(1 for i in range(1, len(positions)) if positions[i] < positions[i - 1])
    backward_ratio = backward / (len(positions) - 1)
    return _clamp(50 + (1 - backward_ratio) * 50)


def _burst_pause_regularity(events: list[dict]) -> int:
    keystrokes = sorted([e for e in events if e["type"] == "keystroke"], key=lambda x: x["ts"])
    if len(keystrokes) < 15:
        return 72
    bursts: list[int] = []
    burst_len = 0
    for i in range(1, len(keystrokes)):
        gap = keystrokes[i]["ts"] - keystrokes[i - 1]["ts"]
        if gap < 500:
            burst_len += 1
        elif burst_len > 0:
            bursts.append(burst_len)
            burst_len = 0
    if len(bursts) < 3:
        return 72
    mean = sum(bursts) / len(bursts)
    variance = sum((b - mean) ** 2 for b in bursts) / len(bursts)
    cv = math.sqrt(variance) / mean if mean > 0 else 1
    return _clamp(100 - cv * 40)


def _cross_session_consistency(events: list[dict]) -> int:
    sessions = _group_by_session(events)
    if len(sessions) <= 1:
        return 75
    speeds = []
    for session_events in sessions.values():
        ks = [e for e in session_events if e["type"] == "keystroke"]
        if len(ks) < 5:
            continue
        intervals = [ks[i]["ts"] - ks[i - 1]["ts"] for i in range(1, len(ks))]
        intervals = [x for x in intervals if 0 < x < 5000]
        if intervals:
            speeds.append(sum(intervals) / len(intervals))
    if len(speeds) < 2:
        return 75
    mean = sum(speeds) / len(speeds)
    variance = sum((s - mean) ** 2 for s in speeds) / len(speeds)
    cv = math.sqrt(variance) / mean if mean > 0 else 0
    return _clamp(100 - cv * 60)


def _ai_insertion_ratio(events: list[dict]) -> int:
    inserts = [e for e in events if e["type"] == "ai_insert"]
    offered = sum((e["payload"].get("chars_offered") or 0) for e in inserts)
    inserted = sum((e["payload"].get("chars_inserted") or 0) for e in inserts)
    if offered == 0:
        return 100
    return _clamp((inserted / offered) * 100)


def _ai_query_complexity(events: list[dict]) -> int:
    queries = [e for e in events if e["type"] == "ai_query"]
    if not queries:
        return 85
    lengths = [(e["payload"].get("query_length") or 0) for e in queries]
    avg_len = sum(lengths) / len(lengths)
    if avg_len < 30:
        return 90
    if avg_len < 100:
        return 75
    return _clamp(100 - (avg_len - 100) / 5)


def _first_session_volume(events: list[dict], word_count: int) -> int:
    sessions = _group_by_session(events)
    if not sessions or word_count == 0:
        return 70
    first_session = min(sessions.keys(), key=lambda sid: min(e["ts"] for e in sessions[sid]))
    first_keystrokes = len([e for e in sessions[first_session] if e["type"] == "keystroke"])
    total_keystrokes = len([e for e in events if e["type"] == "keystroke"])
    if total_keystrokes == 0:
        return 70
    ratio = first_keystrokes / total_keystrokes
    if ratio > 0.85:
        return _clamp(100 - ratio * 50)
    return _clamp(60 + (1 - ratio) * 40)


def _deletion_pattern(events: list[dict]) -> int:
    deletes = [e for e in events if e["type"] == "delete"]
    if not deletes:
        return 80
    large = sum(1 for d in deletes if (d["payload"].get("chars_deleted") or 0) > 50)
    ratio = large / len(deletes)
    return _clamp(100 - ratio * 80)


def _thinking_pause_distribution(events: list[dict]) -> int:
    pauses = [e for e in events if e["type"] == "pause"]
    long_pauses = [p for p in pauses if (p["payload"].get("duration_ms") or 0) >= 10000]
    if not pauses:
        return 65
    ratio = len(long_pauses) / len(pauses)
    return _clamp(50 + ratio * 50)


def _time_to_first_word(events: list[dict]) -> int:
    if not events:
        return 75
    session_starts: dict[str, int] = {}
    for e in events:
        sid = e["session_id"]
        if sid not in session_starts or e["ts"] < session_starts[sid]:
            session_starts[sid] = e["ts"]
    first_keystrokes = []
    for e in events:
        if e["type"] == "keystroke":
            start = session_starts.get(e["session_id"], e["ts"])
            first_keystrokes.append(e["ts"] - start)
    if not first_keystrokes:
        return 75
    avg_gap = sum(first_keystrokes) / len(first_keystrokes)
    if avg_gap > 120_000:
        return 35
    if avg_gap > 30_000:
        return 55
    return _clamp(100 - avg_gap / 2000)


def extract_signals(events: list[Event], word_count: int) -> dict[str, int]:
    typed = [_event_to_dict(e) for e in events]
    return {
        "typing_speed_consistency": _typing_speed_consistency(typed),
        "pause_before_content_ratio": _pause_before_content_ratio(typed),
        "revision_depth_score": _revision_depth_score(typed),
        "paste_to_original_ratio": _paste_to_original_ratio(typed, word_count),
        "session_distribution_entropy": _session_distribution_entropy(typed),
        "edit_directionality": _edit_directionality(typed),
        "burst_pause_regularity": _burst_pause_regularity(typed),
        "cross_session_consistency": _cross_session_consistency(typed),
        "ai_insertion_ratio": _ai_insertion_ratio(typed),
        "ai_query_complexity": _ai_query_complexity(typed),
        "first_session_volume": _first_session_volume(typed, word_count),
        "deletion_pattern": _deletion_pattern(typed),
        "thinking_pause_distribution": _thinking_pause_distribution(typed),
        "time_to_first_word": _time_to_first_word(typed),
    }


def compute_authenticity_score(signals: dict[str, int]) -> int:
    if not signals:
        return 50
    total = sum(signals.get(k, 50) * SIGNAL_WEIGHTS.get(k, 0) for k in BEHAVIOURAL_SIGNALS)
    weight_sum = sum(SIGNAL_WEIGHTS.get(k, 0) for k in BEHAVIOURAL_SIGNALS if k in signals)
    return _clamp(total / weight_sum if weight_sum > 0 else 50)


def triage_from_score(score: int) -> str:
    if score >= 70:
        return "green"
    if score >= 40:
        return "amber"
    return "red"
