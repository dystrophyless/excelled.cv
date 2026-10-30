from sqlalchemy import func, select

from src.auth.models import PasswordResetRequest, PendingUser


async def get_pending_user_by_email(session, *, email: str) -> PendingUser | None:
    query = (
        select(PendingUser)
        .where(func.lower(PendingUser.email) == email.lower())
    )

    result = await session.execute(query)

    pending_user: PendingUser | None = result.scalar_one_or_none()

    return pending_user


async def get_reset_request_by_email(session, *, email: str) -> PasswordResetRequest | None:
    query = select(PasswordResetRequest).where(PasswordResetRequest.email == email.lower())

    result = await session.execute(query)

    return result.scalar_one_or_none()


async def get_reset_request_by_token_hash(session, *, token_hash: str) -> PasswordResetRequest | None:
    query = select(PasswordResetRequest).where(PasswordResetRequest.reset_token_hash == token_hash)

    result = await session.execute(query)

    return result.scalar_one_or_none()
