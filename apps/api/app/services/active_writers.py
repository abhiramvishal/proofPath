"""In-memory registry of actively writing students per assignment."""

import asyncio
import time
from collections import defaultdict
from typing import Any

# {assignment_id: {student_id: {"name": str, "last_ts": float, "word_count": int}}}
_writers: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)

# WebSocket connections: {assignment_id: set of asyncio.Queue}
_queues: dict[str, set[asyncio.Queue]] = defaultdict(set)

ACTIVE_WINDOW_SECONDS = 120  # student is "active" if they wrote within this window


def record_activity(assignment_id: str, student_id: str, student_name: str, word_count: int) -> None:
    _writers[assignment_id][student_id] = {
        "name": student_name,
        "last_ts": time.time(),
        "word_count": word_count,
    }
    _broadcast(assignment_id)


def get_active(assignment_id: str) -> list[dict[str, Any]]:
    now = time.time()
    result = []
    for sid, info in list(_writers[assignment_id].items()):
        if now - info["last_ts"] < ACTIVE_WINDOW_SECONDS:
            result.append({"student_id": sid, **info})
    return result


def subscribe(assignment_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _queues[assignment_id].add(q)
    return q


def unsubscribe(assignment_id: str, q: asyncio.Queue) -> None:
    _queues[assignment_id].discard(q)


def _broadcast(assignment_id: str) -> None:
    active = get_active(assignment_id)
    for q in list(_queues[assignment_id]):
        try:
            q.put_nowait(active)
        except asyncio.QueueFull:
            pass
