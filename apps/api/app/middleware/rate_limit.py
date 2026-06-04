"""Redis-backed rate limiting — wire in production."""

from fastapi import Request


async def rate_limit_middleware(request: Request, call_next):
    # TODO: implement Redis sliding window per IP/user
    return await call_next(request)
