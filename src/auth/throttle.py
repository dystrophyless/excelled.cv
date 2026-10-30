"""Sign-in throttling (FR-009a, research R5): 5 failures in a row for one email pause sign-in for 15 minutes.

Keyed by normalised email whether or not an account exists, so the pause reveals nothing.
"""

import math
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import SignInThrottle

MAX_FAILURES = 5
LOCK_FOR = timedelta(minutes=15)


async def check(db: AsyncSession, email: str) -> int | None:
    """Seconds left of the pause for this email, or None when sign-in is allowed."""
    row = await db.get(SignInThrottle, email)
    if row is None or row.locked_until is None:
        return None

    left = (row.locked_until - datetime.now(UTC)).total_seconds()
    return math.ceil(left) if left > 0 else None


async def fail(db: AsyncSession, email: str) -> int | None:
    """Counts one failed sign-in. Returns the pause in seconds when this failure started one."""
    row = await db.get(SignInThrottle, email)
    if row is None:
        row = SignInThrottle(email=email, failed_count=0)
        db.add(row)

    # a pause that already ended starts a fresh count
    if row.locked_until is not None and row.locked_until <= datetime.now(UTC):
        row.locked_until = None
        row.failed_count = 0

    row.failed_count += 1

    locked_for: int | None = None
    if row.failed_count >= MAX_FAILURES:
        row.locked_until = datetime.now(UTC) + LOCK_FOR
        row.failed_count = 0
        locked_for = int(LOCK_FOR.total_seconds())

    await db.commit()
    return locked_for


async def clear(db: AsyncSession, email: str) -> None:
    """A successful sign-in or password reset starts the count over (the caller commits)."""
    await db.execute(delete(SignInThrottle).where(SignInThrottle.email == email))
