"""30-day, individually revocable sessions (research R1).

The browser holds a random token in an HttpOnly cookie; the database holds only its SHA-256.
"""

from datetime import UTC, datetime, timedelta

from fastapi import Response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import Session
from src.auth.utils import hash_token, new_token
from src.config import settings
from src.users.models import User

COOKIE_NAME = "novio_session"
COOKIE_PATH = "/api"
LAST_SEEN_EVERY = timedelta(hours=1)


async def create_session(
    db: AsyncSession,
    user: User,
    user_agent: str | None,
) -> tuple[Session, str]:
    """Creates a session row (flushed, not committed) and returns it with the raw cookie value."""
    raw = new_token()
    now = datetime.now(UTC)
    session = Session(
        user_id=user.id,
        token_hash=hash_token(raw),
        created_at=now,
        expires_at=now + timedelta(days=settings.session_days),
        last_seen_at=now,
        user_agent=user_agent[:255] if user_agent else None,
    )
    db.add(session)
    await db.flush()
    return session, raw


async def resolve(db: AsyncSession, raw: str | None) -> tuple[Session, User] | None:
    """The valid session and its account for a cookie value, or None."""
    if not raw:
        return None

    now = datetime.now(UTC)
    row = (
        await db.execute(
            select(Session, User)
            .join(User, User.id == Session.user_id)
            .where(
                Session.token_hash == hash_token(raw),
                Session.revoked_at.is_(None),
                Session.expires_at > now,
            )
        )
    ).first()

    if row is None:
        return None

    session, user = row
    if now - session.last_seen_at >= LAST_SEEN_EVERY:
        session.last_seen_at = now
        await db.commit()

    return session, user


async def revoke(db: AsyncSession, session: Session) -> None:
    if session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)


async def revoke_all_except(db: AsyncSession, user_id: int, keep_id) -> None:
    await db.execute(
        update(Session)
        .where(
            Session.user_id == user_id,
            Session.id != keep_id,
            Session.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(UTC))
    )


def set_cookie(response: Response, raw: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        raw,
        max_age=settings.session_days * 24 * 60 * 60,
        path=COOKIE_PATH,
        httponly=True,
        samesite="lax",
        secure=settings.environment != "development",
    )


def clear_cookie(response: Response) -> None:
    response.delete_cookie(
        COOKIE_NAME,
        path=COOKIE_PATH,
        httponly=True,
        samesite="lax",
        secure=settings.environment != "development",
    )
