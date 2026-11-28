"""Student skills API (contracts/skills-api.md). Owner only; the skill names are the shared vocabulary of `/api/skills`."""

from typing import Annotated

import anyio
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.exceptions import api_error
from src.cv import repository as cv_repository
from src.cv import text as cv_text
from src.database import get_session
from src.profiles.dependencies import profile_required, require_student_profile
from src.skills import extract
from src.skills import repository as skills_repository
from src.student_skills import repository
from src.student_skills.schemas import ExtractedSkillsOut, StudentSkillsIn, StudentSkillsOut

router = APIRouter(prefix="/student/skills")

PROFILE_MESSAGE = "Create your profile to add skills."

ProfileId = Annotated[int, Depends(require_student_profile(PROFILE_MESSAGE))]
Db = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=StudentSkillsOut)
async def get_skills(profile_id: ProfileId, db: Db, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return await repository.list_for(db, profile_id)


@router.put("", response_model=StudentSkillsOut)
async def save_skills(body: StudentSkillsIn, profile_id: ProfileId, db: Db):
    try:
        return await repository.replace_all(db, profile_id, body.skills)
    except repository.ProfileGone:
        raise profile_required(PROFILE_MESSAGE) from None


def _cv_changed():
    return api_error(
        status.HTTP_409_CONFLICT,
        "cv_changed",
        "Your CV was changed while we were reading it. Try again.",
    )


@router.post("/extract", response_model=ExtractedSkillsOut)
async def extract_skills(profile_id: ProfileId, db: Db):
    """Reads the student's CV and stores the skills found as not yet confirmed (US-17). Nothing leaves the server."""
    current = await cv_repository.get_current(db, profile_id)
    if current is None:
        raise api_error(status.HTTP_409_CONFLICT, "cv_required", "Upload your CV first, then we can read its skills.")
    cv = await cv_repository.get_with_content(db, profile_id, current.id)
    if cv is None:
        raise _cv_changed()
    cv_id, data, fmt = cv.id, cv.content, cv.format
    vocabulary = await skills_repository.all_names(db)
    await db.commit()  # the connection goes back to the pool while the file is parsed

    try:
        text = await anyio.to_thread.run_sync(cv_text.extract_text, data, fmt.value)
    except cv_text.Unreadable:
        raise api_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "cv_unreadable",
            "We couldn't read text from this CV. Upload a PDF or DOCX that is not a scan or a photo.",
        ) from None
    found = await anyio.to_thread.run_sync(extract.find_skills, text, vocabulary)

    try:
        return await repository.add_extracted(db, profile_id, cv_id, [item.name for item in found])
    except repository.CvChanged:
        raise _cv_changed() from None
    except repository.ProfileGone:
        raise profile_required(PROFILE_MESSAGE) from None
