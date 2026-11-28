"""Database access for a student's skills. Everything is scoped to one profile id."""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.cv.models import StudentCv
from src.profiles.models import StudentProfile
from src.skills.models import Skill
from src.skills.normalize import clean_name, skill_key
from src.skills.repository import upsert_skills
from src.student_skills.models import SkillSource, StudentSkill
from src.student_skills.schemas import MAX_SKILLS, ExtractedSkillsOut, StudentSkillOut, StudentSkillsOut


class ProfileGone(Exception):
    """The profile was deleted while the request was running."""


class CvChanged(Exception):
    """The CV that was read is no longer the profile's current CV (replaced or removed meanwhile)."""


async def list_for(db: AsyncSession, profile_id: int) -> StudentSkillsOut:
    rows = (
        await db.execute(
            select(Skill.name, StudentSkill.source, StudentSkill.confirmed)
            .join(Skill, Skill.id == StudentSkill.skill_id)
            .where(StudentSkill.profile_id == profile_id)
            .order_by(StudentSkill.position)
        )
    ).all()
    return StudentSkillsOut(
        skills=[StudentSkillOut(name=name, source=source, confirmed=confirmed) for name, source, confirmed in rows]
    )


def _unique_names(names: list[str]) -> list[str]:
    """Cleaned names in the order given; a skill typed twice (any letter case) is kept once, in its first form."""
    seen: dict[str, str] = {}
    for raw in names:
        name = clean_name(raw)
        if name:
            seen.setdefault(skill_key(name), name)
    return list(seen.values())


async def replace_all(db: AsyncSession, profile_id: int, names: list[str]) -> StudentSkillsOut:
    """Makes `names` the student's skills, all confirmed.

    A skill that was already there keeps its source (a CV skill stays "cv" once the student confirmed it); a new one is
    "manual". The profile row is locked first so two saves at once run one after the other instead of colliding.
    """
    locked = await db.scalar(select(StudentProfile.id).where(StudentProfile.id == profile_id).with_for_update())
    if locked is None:
        await db.rollback()
        raise ProfileGone

    wanted = _unique_names(names)
    previous = {
        skill_id: source
        for skill_id, source in (
            await db.execute(select(StudentSkill.skill_id, StudentSkill.source).where(StudentSkill.profile_id == profile_id))
        ).all()
    }
    skills = await upsert_skills(db, wanted)

    await db.execute(delete(StudentSkill).where(StudentSkill.profile_id == profile_id))
    for position, name in enumerate(wanted):
        skill = skills[skill_key(name)]
        db.add(
            StudentSkill(
                profile_id=profile_id,
                skill_id=skill.id,
                source=previous.get(skill.id, SkillSource.manual),
                confirmed=True,
                position=position,
            )
        )
    await db.commit()
    return await list_for(db, profile_id)


async def add_extracted(db: AsyncSession, profile_id: int, cv_id: uuid.UUID, names: list[str]) -> ExtractedSkillsOut:
    """Stores the skills found in the CV `cv_id` for the student to review (US-17).

    Skills the student already has (typed, or confirmed earlier) are never touched. Skills from an earlier reading that
    the student has not reviewed are replaced by this reading, so a new CV does not leave old guesses behind. New skills
    are `cv` and not confirmed; the list stops at the limit, keeping the first `names` (most mentioned first).
    """
    locked = await db.scalar(select(StudentProfile.id).where(StudentProfile.id == profile_id).with_for_update())
    if locked is None:
        await db.rollback()
        raise ProfileGone
    if await db.scalar(select(StudentCv.id).where(StudentCv.profile_id == profile_id)) != cv_id:
        await db.rollback()
        raise CvChanged

    await db.execute(
        delete(StudentSkill).where(
            StudentSkill.profile_id == profile_id,
            StudentSkill.source == SkillSource.cv,
            StudentSkill.confirmed.is_(False),
        )
    )
    kept = (
        await db.execute(
            select(Skill.key, StudentSkill.position)
            .join(Skill, Skill.id == StudentSkill.skill_id)
            .where(StudentSkill.profile_id == profile_id)
        )
    ).all()
    have = {key for key, _ in kept}
    last = max((position for _, position in kept), default=-1)

    candidates = [name for name in _unique_names(names) if skill_key(name) not in have]
    room = max(MAX_SKILLS - len(kept), 0)
    chosen = candidates[:room]

    skills = await upsert_skills(db, chosen)
    for offset, name in enumerate(chosen, start=1):
        db.add(
            StudentSkill(
                profile_id=profile_id,
                skill_id=skills[skill_key(name)].id,
                source=SkillSource.cv,
                confirmed=False,
                position=last + offset,
            )
        )
    await db.commit()

    listed = await list_for(db, profile_id)
    return ExtractedSkillsOut(skills=listed.skills, added=chosen, truncated=len(candidates) > room)
