"""Event buffer sync — Redis batch processing."""

import json

import redis.asyncio as redis

from app.config import settings


class EventBufferService:
    def __init__(self):
        self._redis: redis.Redis | None = None

    async def connect(self):
        self._redis = redis.from_url(settings.redis_url, decode_responses=True)

    async def buffer_events(self, submission_id: str, events: list[dict]) -> None:
        if not self._redis:
            await self.connect()
        key = f"events:buffer:{submission_id}"
        await self._redis.rpush(key, json.dumps(events))
        await self._redis.expire(key, 86400)

    async def flush_buffer(self, submission_id: str) -> list[dict]:
        if not self._redis:
            await self.connect()
        key = f"events:buffer:{submission_id}"
        raw = await self._redis.lrange(key, 0, -1)
        await self._redis.delete(key)
        result = []
        for item in raw:
            result.extend(json.loads(item))
        return result


event_buffer = EventBufferService()
