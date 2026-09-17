from sqlalchemy import func, select

from src.auth.models import PendingUser


async def get_pending_user_by_email(session, *, email: str) -> PendingUser | None:
    query = (
        select(PendingUser)
        .where(func.lower(PendingUser.email) == email.lower())
    )

    result = await session.execute(query)

    pending_user: PendingUser | None = result.scalar_one_or_none()

    return pending_user
