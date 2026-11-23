from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.users.models import User, UserRole


async def check_if_user_exists_by_email(session: AsyncSession, *, email: str) -> bool:
    query = (
        select(User.id)
        .where(func.lower(User.email) == email.lower())
    )

    result = await session.execute(query)

    user_id: int | None = result.scalar_one_or_none()

    exists: bool = user_id is not None

    return exists


async def add_user(
    session: AsyncSession,
    *,
    username: str | None,
    email: str,
    hashed_password: str,
    role: UserRole,
) -> User:
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        role=role,
    )

    session.add(user)

    return user


async def get_user_by_email(
    session: AsyncSession,
    *,
    email: str,
) -> User | None:
    query = (
        select(User)
        .where(func.lower(User.email) == email.lower())
    )

    result = await session.execute(query)

    user: User | None = result.scalar_one_or_none()

    return user