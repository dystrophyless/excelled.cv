"""Database access for profiles. Writes are versioned (research R1); child lists are replaced as a whole."""

from sqlalchemy import exists, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.profiles.models import CompanyProfile, StudentLanguage, StudentProfile, StudentProject
from src.profiles.schemas import (
    CompanyProfileIn,
    CompanyProfileOut,
    Contacts,
    LanguageOut,
    ProjectOut,
    StudentProfileIn,
    StudentProfileOut,
)
from src.users.models import User, UserRole


class ProfileExists(Exception):
    """The account already has a profile (unique user_id)."""


# ---- has_profile (research R2) -----------------------------------------------------------------


async def has_profile(db: AsyncSession, user: User) -> bool:
    model = StudentProfile if user.role == UserRole.student else CompanyProfile
    return bool(await db.scalar(select(exists().where(model.user_id == user.id))))


# ---- student ----------------------------------------------------------------------------------


def _student_columns(data: StudentProfileIn) -> dict:
    contacts = data.contacts
    return {
        "full_name": data.full_name,
        "university": data.university,
        "degree": data.degree,
        "major": data.major,
        "study_year": data.study_year,
        "graduated": data.graduated,
        "gpa": data.gpa,
        "looking_for_fields": list(data.looking_for_fields),
        "position_types": list(data.position_types),
        "city": data.city,
        "about": data.about,
        "phone": contacts.phone,
        "whatsapp": contacts.whatsapp,
        "telegram": contacts.telegram,
        "linkedin_url": contacts.linkedin_url,
        "github_url": contacts.github_url,
        "website_url": contacts.website_url,
    }


def _children(data: StudentProfileIn) -> tuple[list[StudentProject], list[StudentLanguage]]:
    projects = [
        StudentProject(position=i, title=p.title, description=p.description, url=p.url)
        for i, p in enumerate(data.projects)
    ]
    languages = [
        StudentLanguage(position=i, language=lang.language, level=lang.level) for i, lang in enumerate(data.languages)
    ]
    return projects, languages


async def get_student(db: AsyncSession, user_id: int) -> StudentProfile | None:
    return await db.scalar(
        select(StudentProfile).where(StudentProfile.user_id == user_id).execution_options(populate_existing=True)
    )


async def create_student(db: AsyncSession, user_id: int, data: StudentProfileIn) -> StudentProfile:
    projects, languages = _children(data)
    profile = StudentProfile(user_id=user_id, **_student_columns(data), projects=projects, languages=languages)
    db.add(profile)
    try:
        await db.commit()
    except IntegrityError as error:  # two onboarding submits at once: the other one won
        await db.rollback()
        raise ProfileExists from error
    return await get_student(db, user_id)


async def update_student(db: AsyncSession, user_id: int, version: int, data: StudentProfileIn) -> StudentProfile | None:
    """Returns the updated profile, or None when nothing matched (missing profile or stale version)."""
    result = await db.execute(
        update(StudentProfile)
        .where(StudentProfile.user_id == user_id, StudentProfile.version == version)
        .values(**_student_columns(data), version=StudentProfile.version + 1)
        .returning(StudentProfile.id)
    )
    profile_id = result.scalar_one_or_none()
    if profile_id is None:  # nothing was written; no rollback (it would expire the caller's objects)
        return None
    profile = await db.get(StudentProfile, profile_id, populate_existing=True)
    projects, languages = _children(data)
    profile.projects = projects
    profile.languages = languages
    await db.commit()
    return await get_student(db, user_id)


def student_out(profile: StudentProfile) -> StudentProfileOut:
    return StudentProfileOut(
        full_name=profile.full_name,
        university=profile.university,
        degree=profile.degree,
        major=profile.major,
        study_year=profile.study_year,
        graduated=profile.graduated,
        gpa=None if profile.gpa is None else f"{profile.gpa:.2f}",
        looking_for_fields=profile.looking_for_fields,
        position_types=profile.position_types,
        city=profile.city,
        about=profile.about,
        contacts=Contacts(
            phone=profile.phone,
            whatsapp=profile.whatsapp,
            telegram=profile.telegram,
            linkedin_url=profile.linkedin_url,
            github_url=profile.github_url,
            website_url=profile.website_url,
        ),
        projects=[ProjectOut(title=p.title, description=p.description, url=p.url) for p in profile.projects],
        languages=[LanguageOut(language=lang.language, level=lang.level) for lang in profile.languages],
        version=profile.version,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


# ---- company ----------------------------------------------------------------------------------


def _company_columns(data: CompanyProfileIn) -> dict:
    return data.model_dump(exclude={"version"})


async def get_company(db: AsyncSession, user_id: int) -> CompanyProfile | None:
    return await db.scalar(
        select(CompanyProfile).where(CompanyProfile.user_id == user_id).execution_options(populate_existing=True)
    )


async def create_company(db: AsyncSession, user_id: int, data: CompanyProfileIn) -> CompanyProfile:
    db.add(CompanyProfile(user_id=user_id, **_company_columns(data)))
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise ProfileExists from error
    return await get_company(db, user_id)


async def update_company(db: AsyncSession, user_id: int, version: int, data: CompanyProfileIn) -> CompanyProfile | None:
    result = await db.execute(
        update(CompanyProfile)
        .where(CompanyProfile.user_id == user_id, CompanyProfile.version == version)
        .values(**_company_columns(data), version=CompanyProfile.version + 1)
        .returning(CompanyProfile.id)
    )
    if result.scalar_one_or_none() is None:
        return None
    await db.commit()
    return await get_company(db, user_id)


def company_out(profile: CompanyProfile) -> CompanyProfileOut:
    return CompanyProfileOut.model_validate(profile, from_attributes=True)
