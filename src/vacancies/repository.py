"""Owner-scoped queries (research R4: not found and not yours are the same `None`) and versioned writes (R3)."""

from collections import defaultdict

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.skills.models import Skill
from src.skills.repository import upsert_skills
from src.skills.normalize import skill_key
from src.vacancies.models import SkillKind, Vacancy, VacancySkill, VacancyStatus
from src.vacancies.schemas import Counts, VacancyOut


async def get_own(db: AsyncSession, vacancy_id: int, employer_id: int) -> Vacancy | None:
    return (
        await db.execute(
            select(Vacancy)
            .where(Vacancy.id == vacancy_id, Vacancy.employer_id == employer_id)
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()


async def load_skills(db: AsyncSession, vacancy_ids: list[int]) -> dict[int, tuple[list[str], list[str]]]:
    """vacancy id → (required names, nice names), in the order they were entered."""
    if not vacancy_ids:
        return {}
    rows = (
        await db.execute(
            select(VacancySkill.vacancy_id, VacancySkill.kind, Skill.name)
            .join(Skill, Skill.id == VacancySkill.skill_id)
            .where(VacancySkill.vacancy_id.in_(vacancy_ids))
            .order_by(VacancySkill.vacancy_id, VacancySkill.position)
        )
    ).all()
    grouped: dict[int, tuple[list[str], list[str]]] = defaultdict(lambda: ([], []))
    for vacancy_id, kind, name in rows:
        grouped[vacancy_id][0 if kind == SkillKind.required else 1].append(name)
    return grouped


def to_out(vacancy: Vacancy, required: list[str], nice: list[str]) -> VacancyOut:
    return VacancyOut(
        id=vacancy.id,
        title=vacancy.title,
        type=vacancy.type,
        field=vacancy.field,
        city=vacancy.city,
        format=vacancy.format,
        description=vacancy.description,
        duration=vacancy.duration,
        salary=vacancy.salary,
        apply_by=vacancy.apply_by,
        closes_at=vacancy.closes_at,
        required_skills=required,
        nice_skills=nice,
        status=vacancy.status,
        published_at=vacancy.published_at,
        closed_at=vacancy.closed_at,
        closed_by=vacancy.closed_by,
        version=vacancy.version,
        created_at=vacancy.created_at,
        updated_at=vacancy.updated_at,
    )


async def out_for(db: AsyncSession, vacancy: Vacancy) -> VacancyOut:
    required, nice = (await load_skills(db, [vacancy.id])).get(vacancy.id, ([], []))
    return to_out(vacancy, required, nice)


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def list_own(
    db: AsyncSession,
    employer_id: int,
    status: VacancyStatus | None,
    query: str,
) -> list[VacancyOut]:
    statement = select(Vacancy).where(Vacancy.employer_id == employer_id)
    if status is not None:
        statement = statement.where(Vacancy.status == status)
    if query.strip():
        statement = statement.where(Vacancy.title.ilike(f"%{_escape_like(query.strip())}%", escape="\\"))
    vacancies = (
        await db.execute(
            statement.order_by(Vacancy.updated_at.desc(), Vacancy.id.desc()).execution_options(populate_existing=True)
        )
    ).scalars().all()
    skills = await load_skills(db, [v.id for v in vacancies])
    return [to_out(v, *skills.get(v.id, ([], []))) for v in vacancies]


async def counts_own(db: AsyncSession, employer_id: int) -> Counts:
    """Group counts for the status filter; they ignore the search text and the selected group."""
    rows = (
        await db.execute(
            select(Vacancy.status, func.count()).where(Vacancy.employer_id == employer_id).group_by(Vacancy.status)
        )
    ).all()
    by_status = {status: count for status, count in rows}
    return Counts(
        all=sum(by_status.values()),
        draft=by_status.get(VacancyStatus.draft, 0),
        open=by_status.get(VacancyStatus.open, 0),
        paused=by_status.get(VacancyStatus.paused, 0),
        closed=by_status.get(VacancyStatus.closed, 0),
    )


async def set_skills(db: AsyncSession, vacancy_id: int, required: list[str], nice: list[str]) -> None:
    """Replace a vacancy's skills. `required` / `nice` are already resolved (rules.resolve_skills)."""
    await db.execute(delete(VacancySkill).where(VacancySkill.vacancy_id == vacancy_id))
    skills = await upsert_skills(db, required + nice)
    for kind, names in ((SkillKind.required, required), (SkillKind.nice, nice)):
        for position, name in enumerate(names):
            db.add(
                VacancySkill(
                    vacancy_id=vacancy_id,
                    skill_id=skills[skill_key(name)].id,
                    kind=kind,
                    position=position,
                )
            )


async def update_versioned(
    db: AsyncSession,
    vacancy_id: int,
    employer_id: int,
    version: int,
    values: dict,
    *conditions,
) -> Vacancy | None:
    """`UPDATE … WHERE id AND owner AND version [AND conditions]`; bumps the version. None when nothing matched —
    the caller then looks at the current row to tell not-found / conflict / invalid transition apart."""
    return (
        await db.execute(
            update(Vacancy)
            .where(
                Vacancy.id == vacancy_id,
                Vacancy.employer_id == employer_id,
                Vacancy.version == version,
                *conditions,
            )
            .values(**values, version=Vacancy.version + 1)
            .returning(Vacancy)
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
