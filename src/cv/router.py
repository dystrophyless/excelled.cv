"""CV API (contracts/cv-api.md). Owner only; the body of an upload is the raw file."""

import uuid
from typing import Annotated

import anyio
from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response as RawResponse

from src.auth.dependencies import CurrentAccount, require_role
from src.auth.exceptions import api_error
from src.cv import formats, receive, repository
from src.cv.models import MAX_BYTES, CvFormat, StudentCv
from src.cv.schemas import CvOut, CvStateOut
from src.database import get_session
from src.profiles.dependencies import profile_required, require_student_profile, student_profile_id

router = APIRouter(prefix="/student/cv")

PROFILE_MESSAGE = "Create your profile to add a CV."

Student = Annotated[CurrentAccount, Depends(require_role("student"))]
ProfileId = Annotated[int, Depends(require_student_profile(PROFILE_MESSAGE))]
Db = Annotated[AsyncSession, Depends(get_session)]


def _json(cv: StudentCv | None) -> dict | None:
    return None if cv is None else CvOut.model_validate(cv).model_dump(mode="json")


def cv_exists(current: StudentCv):
    return api_error(
        status.HTTP_409_CONFLICT, "cv_exists", "You already have a CV. Replace it instead.", cv=_json(current)
    )


def cv_changed(current: StudentCv | None):
    return api_error(
        status.HTTP_409_CONFLICT,
        "cv_changed",
        "Your CV was changed somewhere else. Check the current one, then try again.",
        cv=_json(current),
    )


def _unsupported():
    return api_error(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "cv_format_unsupported",
        "Upload a PDF or DOCX file. The file must match its extension.",
    )


def _checked_name(request: Request) -> tuple[str, CvFormat]:
    try:
        return formats.clean_name(formats.decode_header(request.headers.get("x-file-name")))
    except formats.InvalidName:
        raise api_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "cv_name_invalid", "The file name could not be read."
        ) from None
    except formats.UnsupportedName:
        raise _unsupported() from None


async def _received_file(request: Request, db: AsyncSession, claimed: CvFormat) -> bytes | None:
    """The validated body (size, then content), or None when the client went away.

    The connection goes back to the pool first: a slow upload must not hold it (research R3).
    """
    await db.commit()
    try:
        data = await receive.read_body(request, MAX_BYTES)
    except receive.Disconnected:
        return None
    except receive.TooLarge:
        raise api_error(
            status.HTTP_413_CONTENT_TOO_LARGE, "cv_too_large", "The file is larger than 5 MB.", max_bytes=MAX_BYTES
        ) from None
    except receive.ReceiveTimeout:
        raise api_error(
            status.HTTP_408_REQUEST_TIMEOUT, "cv_upload_timeout", "The upload took too long. Try again."
        ) from None

    if not data:
        raise api_error(status.HTTP_422_UNPROCESSABLE_CONTENT, "cv_empty", "The file is empty.")
    if await anyio.to_thread.run_sync(formats.detect_format, data) != claimed:
        raise _unsupported()
    return data


@router.get("", response_model=CvStateOut)
async def get_cv(profile_id: ProfileId, db: Db, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return CvStateOut(cv=await repository.get_current(db, profile_id))


@router.post("", response_model=CvOut, status_code=status.HTTP_201_CREATED)
async def upload_cv(request: Request, account: Student, _access: ProfileId, db: Db):
    name, claimed = _checked_name(request)
    data = await _received_file(request, db, claimed)
    if data is None:
        return RawResponse(status_code=status.HTTP_400_BAD_REQUEST)

    # A short transaction: the profile may have been deleted while the body was arriving.
    profile_id = await student_profile_id(db, account.user.id)
    if profile_id is None:
        raise profile_required(PROFILE_MESSAGE)
    if (current := await repository.get_current(db, profile_id)) is not None:
        raise cv_exists(current)
    try:
        return await repository.create(db, profile_id, name, claimed, data)
    except repository.CvExists:
        current = await repository.get_current(db, profile_id)
        if current is None:
            raise
        raise cv_exists(current) from None
    except repository.ProfileGone:
        raise profile_required(PROFILE_MESSAGE) from None


@router.get("/{cv_id}/file")
async def download_cv(cv_id: uuid.UUID, profile_id: ProfileId, db: Db):
    cv = await repository.get_with_content(db, profile_id, cv_id)
    if cv is None:
        # an unknown id and another student's id look the same
        raise cv_changed(await repository.get_current(db, profile_id))
    return RawResponse(
        content=cv.content,
        media_type=formats.MEDIA_TYPES[cv.format],
        headers={
            "Content-Disposition": formats.content_disposition(cv.file_name),
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox; default-src 'none'",
            "Cache-Control": "private, no-store",
        },
    )
