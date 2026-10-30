from dataclasses import dataclass
from typing import Annotated

from fastapi import Cookie, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import sessions
from src.auth.exceptions import api_error
from src.auth.models import Session
from src.database import get_session
from src.users.models import User, UserRole


@dataclass(frozen=True)
class CurrentAccount:
    user: User
    session: Session


def not_signed_in():
    return api_error(
        status.HTTP_401_UNAUTHORIZED,
        "not_signed_in",
        "You're not signed in.",
    )


async def current_account(
    db: Annotated[AsyncSession, Depends(get_session)],
    novio_session: Annotated[str | None, Cookie()] = None,
) -> CurrentAccount:
    resolved = await sessions.resolve(db, novio_session)
    if resolved is None:
        raise not_signed_in()

    session, user = resolved
    return CurrentAccount(user=user, session=session)


def require_role(*roles: UserRole | str):
    """Dependency for role-specific routes: 401 without a session, 403 for the other role (FR-012)."""
    allowed = {UserRole(role) for role in roles}

    async def dependency(
        account: Annotated[CurrentAccount, Depends(current_account)],
    ) -> CurrentAccount:
        if account.user.role not in allowed:
            raise api_error(
                status.HTTP_403_FORBIDDEN,
                "wrong_role",
                "This page is not available for your account type.",
            )
        return account

    return dependency
