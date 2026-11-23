"""Profiles API (contracts/profiles-api.md). Each role reads and writes only its own profile (FR-013)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import CurrentAccount, require_role
from src.auth.exceptions import api_error
from src.database import get_session
from src.profiles import repository
from src.profiles.schemas import (
    CompanyProfileIn,
    CompanyProfileOut,
    CompanyProfileUpdate,
    StudentProfileIn,
    StudentProfileOut,
    StudentProfileUpdate,
)

router = APIRouter()

Student = Annotated[CurrentAccount, Depends(require_role("student"))]
Employer = Annotated[CurrentAccount, Depends(require_role("employer"))]
Db = Annotated[AsyncSession, Depends(get_session)]


def profile_not_found():
    return api_error(status.HTTP_404_NOT_FOUND, "profile_not_found", "You haven't created your profile yet.")


def profile_exists():
    return api_error(status.HTTP_409_CONFLICT, "profile_exists", "You already have a profile.")


def version_conflict(current: dict):
    return api_error(
        status.HTTP_409_CONFLICT,
        "version_conflict",
        "Your profile was changed somewhere else. Load the latest version, then save again.",
        profile=current,
    )


# ---- student ----------------------------------------------------------------------------------


@router.get("/student/profile", response_model=StudentProfileOut)
async def get_student_profile(account: Student, db: Db):
    profile = await repository.get_student(db, account.user.id)
    if profile is None:
        raise profile_not_found()
    return repository.student_out(profile)


@router.post("/student/profile", response_model=StudentProfileOut, status_code=status.HTTP_201_CREATED)
async def create_student_profile(body: StudentProfileIn, account: Student, db: Db):
    try:
        profile = await repository.create_student(db, account.user.id, body)
    except repository.ProfileExists:
        raise profile_exists() from None
    return repository.student_out(profile)


@router.put("/student/profile", response_model=StudentProfileOut)
async def update_student_profile(body: StudentProfileUpdate, account: Student, db: Db):
    profile = await repository.update_student(db, account.user.id, body.version, body)
    if profile is None:
        current = await repository.get_student(db, account.user.id)
        if current is None:
            raise profile_not_found()
        raise version_conflict(repository.student_out(current).model_dump(mode="json"))
    return repository.student_out(profile)


# ---- company ----------------------------------------------------------------------------------


@router.get("/company/profile", response_model=CompanyProfileOut)
async def get_company_profile(account: Employer, db: Db):
    profile = await repository.get_company(db, account.user.id)
    if profile is None:
        raise profile_not_found()
    return repository.company_out(profile)


@router.post("/company/profile", response_model=CompanyProfileOut, status_code=status.HTTP_201_CREATED)
async def create_company_profile(body: CompanyProfileIn, account: Employer, db: Db):
    try:
        profile = await repository.create_company(db, account.user.id, body)
    except repository.ProfileExists:
        raise profile_exists() from None
    return repository.company_out(profile)


@router.put("/company/profile", response_model=CompanyProfileOut)
async def update_company_profile(body: CompanyProfileUpdate, account: Employer, db: Db):
    profile = await repository.update_company(db, account.user.id, body.version, body)
    if profile is None:
        current = await repository.get_company(db, account.user.id)
        if current is None:
            raise profile_not_found()
        raise version_conflict(repository.company_out(current).model_dump(mode="json"))
    return repository.company_out(profile)
