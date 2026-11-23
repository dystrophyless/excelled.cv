from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.skills.models import Skill
from src.skills.normalize import clean_name, skill_key


async def upsert_skills(db: AsyncSession, names: list[str]) -> dict[str, Skill]:
    """Skill rows for the given names, keyed by `skill_key`; unknown ones are created.

    The first display form seen for a key wins, so "Python" and "python" end up as one skill.
    """
    wanted: dict[str, str] = {}
    for name in names:
        display = clean_name(name)
        if display:
            wanted.setdefault(skill_key(display), display)
    if not wanted:
        return {}

    await db.execute(
        pg_insert(Skill)
        .values([{"name": display, "key": key} for key, display in wanted.items()])
        .on_conflict_do_nothing(index_elements=["key"])
    )
    rows = (await db.execute(select(Skill).where(Skill.key.in_(list(wanted))))).scalars().all()
    return {skill.key: skill for skill in rows}


async def suggest(db: AsyncSession, query: str, limit: int = 10) -> list[str]:
    """Skill names starting with `query`; with an empty query, the most used skills first."""
    # Imported here: the vacancies package imports this module for upserts.
    from src.vacancies.models import VacancySkill

    key = skill_key(query)
    statement = select(Skill.name)
    if key:
        statement = statement.where(Skill.key.startswith(key, autoescape=True)).order_by(Skill.key)
    else:
        statement = (
            statement.outerjoin(VacancySkill, VacancySkill.skill_id == Skill.id)
            .group_by(Skill.id)
            .order_by(func.count(VacancySkill.vacancy_id).desc(), Skill.key)
        )
    return list((await db.execute(statement.limit(limit))).scalars().all())
