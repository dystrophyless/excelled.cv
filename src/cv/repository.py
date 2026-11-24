"""Database access for the CV. Content is read only by `get_with_content` (the download)."""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from src.cv.models import CvFormat, StudentCv


class CvExists(Exception):
    """The profile already has a CV (unique profile_id)."""


class ProfileGone(Exception):
    """The profile was deleted while the body was arriving (foreign key)."""


async def get_current(db: AsyncSession, profile_id: int) -> StudentCv | None:
    """The profile's CV without its content."""
    return await db.scalar(
        select(StudentCv).where(StudentCv.profile_id == profile_id).execution_options(populate_existing=True)
    )


async def get_with_content(db: AsyncSession, profile_id: int, cv_id: uuid.UUID) -> StudentCv | None:
    return await db.scalar(
        select(StudentCv)
        .where(StudentCv.id == cv_id, StudentCv.profile_id == profile_id)
        .options(undefer(StudentCv.content))
        .execution_options(populate_existing=True)
    )


async def create(db: AsyncSession, profile_id: int, name: str, fmt: CvFormat, content: bytes) -> StudentCv:
    """Inserts and commits. The row is not read back: id and date are generated here."""
    cv = StudentCv(profile_id=profile_id, file_name=name, format=fmt, size_bytes=len(content), content=content)
    db.add(cv)
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        detail = str(error.orig)
        if "student_cvs_profile_id_key" in detail:
            raise CvExists from None
        if "student_cvs_profile_id_fkey" in detail:
            raise ProfileGone from None
        raise
    return cv
