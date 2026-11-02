"""Deadline arithmetic (research R2): a vacancy applies until the end of its `apply_by` day in Kazakhstan time (UTC+5)."""

from datetime import UTC, date, datetime, time, timedelta, timezone

# Kazakhstan has one time zone and no daylight saving, so a fixed offset is enough (no tzdata dependency).
KZ = timezone(timedelta(hours=5))


def now_utc() -> datetime:
    """The clock every vacancy route uses — a FastAPI dependency so tests can pin it."""
    return datetime.now(UTC)


def closes_at_for(apply_by: date) -> datetime:
    """The instant applications stop: the start of the day after `apply_by` in UTC+5, as UTC."""
    return datetime.combine(apply_by + timedelta(days=1), time.min, tzinfo=KZ).astimezone(UTC)


def today_kz(now: datetime) -> date:
    return now.astimezone(KZ).date()


def is_future_deadline(apply_by: date, now: datetime) -> bool:
    """A deadline is valid from today (UTC+5) on — it still gives the whole of today."""
    return apply_by >= today_kz(now)
