import uuid
from datetime import datetime

from sqlalchemy import CHAR, DateTime, ForeignKey, String, text
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base
from src.users.models import UserRole, user_role_enum

_NOW_UTC = text("TIMEZONE('utc', now())")


class PendingUser(Base):
    __tablename__ = "pending_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)

    hashed_password: Mapped[str]
    role: Mapped[UserRole] = mapped_column(user_role_enum, nullable=False)
    hashed_code: Mapped[str]
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    attempts: Mapped[int] = mapped_column(default=0)
    last_sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=_NOW_UTC,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=_NOW_UTC,
        onupdate=_NOW_UTC,
    )


class PasswordResetRequest(Base):
    """One active reset per email: code (step 1) → verified + reset token (step 2) → confirmed (step 3).

    An email without an account gets a decoy row (user_id NULL, a code nobody receives) so wrong-code
    attempts, cooldown and expiry behave exactly as for a real account (SC-005).
    """

    __tablename__ = "password_reset_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=True,
    )

    hashed_code: Mapped[str]
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(default=0)
    last_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reset_token_hash: Mapped[str | None] = mapped_column(
        CHAR(64),
        unique=True,
        nullable=True,
    )
    reset_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=_NOW_UTC,
    )


class Session(Base):
    """A signed-in state of one account on one device. Only the SHA-256 of the cookie value is stored."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(CHAR(64), unique=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=_NOW_UTC,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=_NOW_UTC,
    )
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)


class SignInThrottle(Base):
    """Failed sign-ins per normalised email — exists for unknown emails too, so the pause reveals nothing."""

    __tablename__ = "sign_in_throttles"

    email: Mapped[str] = mapped_column(primary_key=True)
    failed_count: Mapped[int] = mapped_column(default=0)
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=_NOW_UTC,
        onupdate=_NOW_UTC,
    )
