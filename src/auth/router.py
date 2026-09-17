from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.emailer import send_verification_email
from src.auth.models import PendingUser
from src.auth.repository import get_pending_user_by_email
from src.auth.schemas import UserRegisterRequest, VerifyEmailRequest
from src.auth.utils import (
    generate_verification_code,
    hash_password,
    hash_verification_code,
    verify_code,
)
from src.database import get_session
from src.users.repository import add_user, check_if_user_exists_by_email

router = APIRouter()


@router.post(
    "/register",
    status_code=status.HTTP_202_ACCEPTED,
)
async def register_user(
    user_data: UserRegisterRequest,
    background_tasks: BackgroundTasks,
    session: Annotated[AsyncSession, Depends(get_session)],
):
    email: str = user_data.email.lower()

    email_exists: bool = await check_if_user_exists_by_email(
        session,
        email=email,
    )

    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists.",
        )

    now = datetime.now(UTC)
    code = generate_verification_code()
    code_hash = hash_verification_code(email, code)
    expires_at = now + timedelta(minutes=10)

    pending_user: PendingUser | None = await get_pending_user_by_email(
        session,
        email=email,
    )

    # If user has already requested to register,
    # but, the request to register is already expired
    # then, we delete the pending user
    if pending_user and pending_user.expires_at < now:
        await session.delete(pending_user)
        await session.commit()
        pending_user = None

    # If user has already requested to register,
    # and, the request to register is still valid
    # then, we check if the last sent time is within 1 minute
    # to keep cooldown for sending verification codes
    previous_last_sent_at: datetime | None = (
        pending_user.last_sent_at if pending_user is not None else None
    )

    if pending_user is not None and previous_last_sent_at is not None:
        cooldown_until: datetime = previous_last_sent_at + timedelta(minutes=1)

        if now < cooldown_until:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUEST,
                detail="You can only request a new verification code once every 1 minute.",
            )

    # If user has not requested to register yet,
    # or, the request to register is already expired,
    # or, the last sent time is more than 1 minute ago
    # then, we create a new pending user
    if pending_user is None:
        pending_user = PendingUser(
            email=email,
            hashed_password=hash_password(user_data.password),
            hashed_code=code_hash,
            expires_at=expires_at,
            last_sent_at=now,
        )
        session.add(pending_user)
    # But, if user has already requested to register,
    # And the request to register is still valid,
    # then, we update the existing pending user
    # with the new data he provided again
    else:
        pending_user.hashed_password = hash_password(user_data.password)
        pending_user.hashed_code = code_hash
        pending_user.expires_at = expires_at
        pending_user.last_sent_at = now
        session.add(pending_user)

    # If the user tried to register twice at one moment
    # then, we catch the IntegrityError and rollback the session,
    # and, we get the pending user again from the database,
    # and, we update the existing pending user with the new data he provided
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        pending_user: PendingUser | None = await get_pending_user_by_email(
            session,
            email=email,
        )

        if pending_user is None:
            raise

        previous_last_sent_at: datetime | None = pending_user.last_sent_at
        pending_user.password_hash = hash_password(user_data.password)
        pending_user.code_hash = code_hash
        pending_user.expires_at = expires_at
        pending_user.last_sent_at = now

        await session.commit()

    background_tasks.add_task(
        send_verification_email,
        to=email,
        code=code,
    )

    return {
        "message": "Verification code is sent to your email. Please check your inbox."
    }


@router.post(
    "/verify-email",
)
async def verify_email(
    verification_data: VerifyEmailRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
):
    email: str = verification_data.email.lower()

    pending_user: PendingUser | None = await get_pending_user_by_email(
        session,
        email=email,
    )

    if pending_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code was not found or is expired.",
        )

    now = datetime.now(UTC)

    if pending_user.expires_at < now:
        await session.delete(pending_user)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired.",
        )

    if pending_user.attempts >= 3:
        await session.delete(pending_user)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts.",
        )

    if not verify_code(email, verification_data.code, pending_user.hashed_code):
        pending_user.attempts += 1
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    try:
        user = await add_user(
            session,
            email=email,
            username=None,
            hashed_password=pending_user.hashed_password,
        )

        if user.id is None:
            await session.flush()

        await session.delete(pending_user)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to complete email verification. Please try requesting a new code.",
        )

    return {"message": "Email verified successfully. You can now log in."}
