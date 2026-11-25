"""Database access for the CV. Content is read only by `get_with_content` (the download)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from src.cv.models import CvFormat, StudentCv
from src.cv.schemas import CvOut


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


async def replace(
    db: AsyncSession, profile_id: int, cv_id: uuid.UUID, name: str, fmt: CvFormat, content: bytes
) -> CvOut | None:
    """One conditional UPDATE (research R5): None when `cv_id` is not the profile's current CV.

    Under READ COMMITTED a concurrent replacement makes the second statement re-check its WHERE against the new id.
    Nothing is read back; content is never loaded.
    """
    values = {
        "id": uuid.uuid4(),
        "file_name": name,
        "format": fmt,
        "size_bytes": len(content),
        "uploaded_at": datetime.now(UTC),
    }
    result = await db.execute(
        update(StudentCv)
        .where(StudentCv.id == cv_id, StudentCv.profile_id == profile_id)
        .values(content=content, **values)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount == 0:
        await db.rollback()
        return None
    await db.commit()
    return CvOut(**values)


async def remove(db: AsyncSession, profile_id: int, cv_id: uuid.UUID) -> bool:
    result = await db.execute(
        delete(StudentCv)
        .where(StudentCv.id == cv_id, StudentCv.profile_id == profile_id)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return result.rowcount > 0
