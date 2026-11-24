"""Read-only queries over active vacancies and their companies (research R1–R3, R6)."""

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import Select, and_, exists, false, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.catalog.enums import City, VacancyField, WorkFormat
from src.opportunities.schemas import (
    KIND_TYPES,
    CompanyName,
    CompanyOut,
    OpportunityItem,
    OpportunityKind,
    OpportunityListOut,
    OpportunityOut,
    OpportunitySort,
)
from src.profiles.models import CompanyProfile
from src.skills.models import Skill
from src.vacancies import rules
from src.vacancies.models import Vacancy, VacancySkill
from src.vacancies.repository import escape_like, load_skills
from src.vacancies.schemas import salary_out

PAGE_SIZE = 10
MAX_WORDS = 8
MAX_ID = 2**31 - 1  # the id column is int4

ORDER = {
    OpportunitySort.newest: (Vacancy.published_at.desc(), Vacancy.id.desc()),
    OpportunitySort.closing: (Vacancy.closes_at.asc(), Vacancy.id.desc()),
}


@dataclass(frozen=True)
class Filters:
    q: str = ""
    kind: OpportunityKind | None = None
    formats: list[WorkFormat] = field(default_factory=list)
    cities: list[City] = field(default_factory=list)
    fields: list[VacancyField] = field(default_factory=list)


def _active(now: datetime, *columns) -> Select:
    """Active vacancies with a company to show; the inner join drops owners without a company profile."""
    return (
        select(*columns)
        .select_from(Vacancy)
        .join(CompanyProfile, CompanyProfile.user_id == Vacancy.employer_id)
        .where(rules.visible_in_search(now))
    )


def _word_matches(word: str):
    pattern = f"%{escape_like(word)}%"
    return or_(
        Vacancy.title.ilike(pattern, escape="\\"),
        CompanyProfile.name.ilike(pattern, escape="\\"),
        exists()
        .where(
            VacancySkill.vacancy_id == Vacancy.id,
            Skill.id == VacancySkill.skill_id,
            Skill.name.ilike(pattern, escape="\\"),
        )
        .correlate(Vacancy),
    )


def _conditions(filters: Filters) -> list:
    if "\x00" in filters.q:  # PostgreSQL text cannot hold it, so nothing can match
        return [false()]
    conditions = []
    words = filters.q.split()[:MAX_WORDS]
    if words:
        conditions.append(and_(*(_word_matches(word) for word in words)))
    if filters.kind is not None:
        conditions.append(Vacancy.type.in_(KIND_TYPES[filters.kind]))
    for column, values in (
        (Vacancy.format, filters.formats),
        (Vacancy.city, filters.cities),
        (Vacancy.field, filters.fields),
    ):
        if values:
            conditions.append(column.in_(values))
    return conditions


def _common(vacancy: Vacancy, skills: dict[int, tuple[list[str], list[str]]]) -> dict:
    required, nice = skills.get(vacancy.id, ([], []))
    return {
        "id": vacancy.id,
        "title": vacancy.title,
        "type": vacancy.type,
        "field": vacancy.field,
        "city": vacancy.city,
        "format": vacancy.format,
        "duration": vacancy.duration,
        "salary": salary_out(vacancy.salary_min, vacancy.salary_max, vacancy.salary_currency),
        "apply_by": vacancy.apply_by,
        "published_at": vacancy.published_at,
        "required_skills": required,
        "nice_skills": nice,
    }


async def list_active(
    db: AsyncSession, now: datetime, filters: Filters, sort: OpportunitySort, page: int
) -> OpportunityListOut:
    conditions = _conditions(filters)
    total = await db.scalar(_active(now, func.count()).where(*conditions)) or 0
    page = min(page, max(1, -(-total // PAGE_SIZE)))

    rows = (
        await db.execute(
            _active(now, Vacancy, CompanyProfile.name)
            .where(*conditions)
            .order_by(*ORDER[sort])
            .limit(PAGE_SIZE)
            .offset((page - 1) * PAGE_SIZE)
            .execution_options(populate_existing=True)
        )
    ).all()
    skills = await load_skills(db, [vacancy.id for vacancy, _ in rows])
    return OpportunityListOut(
        items=[
            OpportunityItem(**_common(vacancy, skills), company=CompanyName(name=company)) for vacancy, company in rows
        ],
        total=total,
        page=page,
        page_size=PAGE_SIZE,
    )


async def get_active(db: AsyncSession, now: datetime, vacancy_id: int) -> OpportunityOut | None:
    if not 0 < vacancy_id <= MAX_ID:
        return None
    row = (
        await db.execute(
            _active(now, Vacancy, CompanyProfile)
            .where(Vacancy.id == vacancy_id)
            .execution_options(populate_existing=True)
        )
    ).one_or_none()
    if row is None:
        return None
    vacancy, company = row
    return OpportunityOut(
        **_common(vacancy, await load_skills(db, [vacancy.id])),
        description=vacancy.description,
        company=CompanyOut.model_validate(company, from_attributes=True),
    )
