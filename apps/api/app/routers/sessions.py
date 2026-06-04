"""WebSocket endpoint for real-time active-student broadcasting to teachers."""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.active_writers import get_active, subscribe, unsubscribe

router = APIRouter()

HEARTBEAT_INTERVAL = 10  # seconds


@router.websocket("/ws/sessions/{assignment_id}")
async def session_stream(assignment_id: str, websocket: WebSocket):
    await websocket.accept()
    q = subscribe(assignment_id)

    # Send current state immediately on connect
    await websocket.send_text(json.dumps(get_active(assignment_id)))

    async def heartbeat():
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            try:
                await websocket.send_text(json.dumps(get_active(assignment_id)))
            except Exception:
                break

    heartbeat_task = asyncio.create_task(heartbeat())

    try:
        while True:
            try:
                active = await asyncio.wait_for(q.get(), timeout=HEARTBEAT_INTERVAL)
                await websocket.send_text(json.dumps(active))
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
        unsubscribe(assignment_id, q)
