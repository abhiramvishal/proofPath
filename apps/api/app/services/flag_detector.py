"""Detect behavioural flags from raw events before narrative generation."""

from __future__ import annotations

from datetime import datetime

from app.models import Event


def _fmt_time(ts: datetime) -> str:
    return ts.strftime("%H:%M")


def detect_flags(events: list[Event], signals: dict[str, int]) -> list[dict]:
    flags: list[dict] = []

    for event in events:
        if event.type == "paste":
            length = event.payload.get("length") or 0
            if length >= 200:
                flags.append(
                    {
                        "code": "large_paste",
                        "message": (
                            f"Large paste event at {_fmt_time(event.ts)} "
                            f"({length} characters)"
                        ),
                        "timestamp": event.ts.isoformat(),
                        "severity": "warning" if length < 500 else "critical",
                    }
                )

        if event.type == "ai_query":
            qlen = event.payload.get("query_length") or 0
            if qlen > 200:
                flags.append(
                    {
                        "code": "complex_ai_query",
                        "message": (
                            f"Complex AI query at {_fmt_time(event.ts)} "
                            f"({qlen} characters)"
                        ),
                        "timestamp": event.ts.isoformat(),
                        "severity": "info",
                    }
                )

    if signals.get("paste_to_original_ratio", 100) < 40:
        flags.append(
            {
                "code": "high_paste_ratio",
                "message": "Paste-to-original ratio suggests significant pasted content",
                "severity": "warning",
            }
        )

    if signals.get("typing_speed_consistency", 100) < 35:
        flags.append(
            {
                "code": "uniform_typing_speed",
                "message": "Typing speed unusually uniform across sessions — may warrant review",
                "severity": "warning",
            }
        )

    if signals.get("first_session_volume", 100) < 45:
        flags.append(
            {
                "code": "first_session_bulk",
                "message": "Large proportion of content produced in the first writing session",
                "severity": "warning",
            }
        )

    if signals.get("time_to_first_word", 100) < 40:
        flags.append(
            {
                "code": "delayed_first_keystroke",
                "message": "Long gap before first keystroke in one or more sessions",
                "severity": "info",
            }
        )

    if signals.get("cross_session_consistency", 100) < 40:
        flags.append(
            {
                "code": "session_style_shift",
                "message": "Writing rhythm differs significantly between sessions",
                "severity": "warning",
            }
        )

    sessions: dict[str, list[Event]] = {}
    for e in events:
        sid = str(e.session_id)
        sessions.setdefault(sid, []).append(e)

    if len(sessions) >= 2:
        session_speeds: list[tuple[str, float]] = []
        for sid, sess_events in sessions.items():
            ks = sorted([e for e in sess_events if e.type == "keystroke"], key=lambda x: x.ts)
            if len(ks) < 10:
                continue
            intervals = [
                (ks[i].ts.timestamp() - ks[i - 1].ts.timestamp()) * 1000
                for i in range(1, len(ks))
            ]
            intervals = [x for x in intervals if 0 < x < 5000]
            if intervals:
                session_speeds.append((sid, sum(intervals) / len(intervals)))

        if len(session_speeds) >= 2:
            baseline = session_speeds[0][1]
            for i, (sid, speed) in enumerate(session_speeds[1:], start=2):
                if baseline > 0 and speed < baseline / 4:
                    flags.append(
                        {
                            "code": "speed_spike",
                            "message": (
                                f"Writing speed ~4× faster than baseline in session {i}"
                            ),
                            "severity": "critical",
                        }
                    )
                    break

    return flags
