"""Six-digit email codes shared by sign-up verification and password reset (research R6).

Rules (FR-004): valid 10 minutes, 3 wrong attempts, one new code per 60 seconds.
"""

import enum
import math
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from src.auth.utils import (
    generate_verification_code,
    hash_verification_code,
    verify_code,
)

CODE_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_ATTEMPTS = 3

RESEND_IN = int(RESEND_COOLDOWN.total_seconds())
EXPIRES_IN = int(CODE_TTL.total_seconds())


class CodeRow(Protocol):
    hashed_code: str
    expires_at: datetime
    attempts: int
    last_sent_at: datetime


@dataclass(frozen=True)
class IssuedCode:
    code: str
    hashed_code: str
    expires_at: datetime
    last_sent_at: datetime


def issue(email: str, now: datetime | None = None) -> IssuedCode:
    now = now or datetime.now(UTC)
    code = generate_verification_code()
    return IssuedCode(
        code=code,
        hashed_code=hash_verification_code(email, code),
        expires_at=now + CODE_TTL,
        last_sent_at=now,
    )


def apply(row: CodeRow, issued: IssuedCode) -> None:
    """Store a freshly issued code on a row; a new code always resets the attempts."""
    row.hashed_code = issued.hashed_code
    row.expires_at = issued.expires_at
    row.last_sent_at = issued.last_sent_at
    row.attempts = 0


def cooldown_left(last_sent_at: datetime | None, now: datetime | None = None) -> int:
    """Whole seconds until a new code may be sent; 0 when it may be sent now."""
    if last_sent_at is None:
        return 0
    now = now or datetime.now(UTC)
    left = (last_sent_at + RESEND_COOLDOWN - now).total_seconds()
    return max(0, math.ceil(left))


class Outcome(enum.Enum):
    OK = "ok"
    INVALID = "invalid_code"
    TOO_MANY = "too_many_attempts"
    EXPIRED = "code_expired"


@dataclass(frozen=True)
class CheckResult:
    outcome: Outcome
    attempts_left: int | None = None


def check(row: CodeRow, email: str, code: str, now: datetime | None = None) -> CheckResult:
    """Check a submitted code. Counts a wrong attempt on `row`; the caller commits and,
    on TOO_MANY, deletes the row. An expired row is kept so the user can ask for a new code."""
    now = now or datetime.now(UTC)

    if row.expires_at < now:
        return CheckResult(Outcome.EXPIRED)

    if verify_code(email, code, row.hashed_code):
        return CheckResult(Outcome.OK)

    row.attempts += 1
    if row.attempts >= MAX_ATTEMPTS:
        return CheckResult(Outcome.TOO_MANY)

    return CheckResult(Outcome.INVALID, attempts_left=MAX_ATTEMPTS - row.attempts)
