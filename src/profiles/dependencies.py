"""Shared guard: a signed-in student who already has a profile (003 FR-013; 004 FR-001; 006 FR-013)."""

from typing import Annotated

from fastapi import Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import CurrentAccount, require_role
from src.auth.exceptions import api_error
from src.database import get_session
from src.profiles.models import StudentProfile


async def student_profile_id(db: AsyncSession, user_id: int) -> int | None:
    return await db.scalar(select(StudentProfile.id).where(StudentProfile.user_id == user_id))


def profile_required(message: str):
    return api_error(status.HTTP_403_FORBIDDEN, "student_profile_required", message)


def require_student_profile(message: str):
    """Dependency factory: 401 / 403 `wrong_role` from the role check, then 403 `student_profile_required`.

    Resolves to the id of the student's profile. `message` is what the student reads, so each feature words its own.
    """

    async def dependency(
        account: Annotated[CurrentAccount, Depends(require_role("student"))],
        db: Annotated[AsyncSession, Depends(get_session)],
    ) -> int:
        profile_id = await student_profile_id(db, account.user.id)
        if profile_id is None:
            raise profile_required(message)
        return profile_id

    return dependency
