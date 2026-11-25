"""Receiving the raw upload body (research R2): limited while it arrives, never buffered past the limit."""

import asyncio

from fastapi import Request
from starlette.requests import ClientDisconnect

# Seconds the whole body may take. A module constant so tests can shorten it.
RECEIVE_TIMEOUT = 60


class TooLarge(Exception):
    pass


class ReceiveTimeout(Exception):
    pass


class Disconnected(Exception):
    """The client went away before the body was complete."""


def _declared_length(request: Request) -> int | None:
    value = request.headers.get("content-length", "").strip()
    return int(value) if value.isascii() and value.isdigit() else None  # an invalid value is ignored


async def read_body(request: Request, limit: int) -> bytes:
    """The body, or TooLarge / ReceiveTimeout / Disconnected. Stops reading as soon as the limit is exceeded."""
    declared = _declared_length(request)
    if declared is not None and declared > limit:
        raise TooLarge

    chunks = bytearray()
    try:
        async with asyncio.timeout(RECEIVE_TIMEOUT):
            async for chunk in request.stream():
                if len(chunks) + len(chunk) > limit:
                    raise TooLarge
                chunks += chunk
    except TimeoutError:
        raise ReceiveTimeout from None
    except ClientDisconnect:
        raise Disconnected from None
    return bytes(chunks)
