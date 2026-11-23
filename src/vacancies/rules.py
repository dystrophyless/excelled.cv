"""The vacancy status rules (data-model.md "State machine", research R1 / R8).

Other features reuse two of them and must not re-implement them:
  * `accepting_applications(vacancy, now)` / `visible_in_search(now)` — a vacancy takes applications and shows in
    student search only while it is Open and before its deadline instant. The future applying feature must refuse
    every other application with 409 `vacancy_not_accepting` (`status`: paused | closed | draft), and the student
    pages show "Not accepting applications right now" (Paused) / "This vacancy is closed" (Closed) — spec FR-017.
"""

import enum
from datetime import UTC, datetime

from sqlalchemy import and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.skills.normalize import clean_name, skill_key
from src.vacancies.models import ClosedBy, Vacancy, VacancyStatus


class Action(enum.StrEnum):
    publish = "publish"
    pause = "pause"
    resume = "resume"
    close = "close"
    reopen = "reopen"


ALLOWED_FROM: dict[Action, frozenset[VacancyStatus]] = {
    Action.publish: frozenset({VacancyStatus.draft}),
    Action.pause: frozenset({VacancyStatus.open}),
    Action.resume: frozenset({VacancyStatus.paused}),
    Action.close: frozenset({VacancyStatus.open, VacancyStatus.paused}),
    Action.reopen: frozenset({VacancyStatus.closed}),
}

TARGET: dict[Action, VacancyStatus] = {
    Action.publish: VacancyStatus.open,
    Action.pause: VacancyStatus.paused,
    Action.resume: VacancyStatus.open,
    Action.close: VacancyStatus.closed,
    Action.reopen: VacancyStatus.open,
}


def can_apply(action: Action, status: VacancyStatus) -> bool:
    return status in ALLOWED_FROM[action]


def resolve_skills(required: list[str], nice: list[str]) -> tuple[list[str], list[str]]:
    """Final skill lists: names cleaned, duplicates dropped (compared case-insensitively), and a skill listed in both
    groups kept only in the group listed last, i.e. Nice to have (spec edge case)."""
    final: dict[str, tuple[str, str]] = {}
    for kind, names in (("required", required), ("nice", nice)):
        for raw in names:
            name = clean_name(raw)
            if name:
                key = skill_key(name)
                # first display form wins; a later group may move the skill
                final[key] = (kind, final[key][1] if key in final else name)
    return (
        [name for kind, name in final.values() if kind == "required"],
        [name for kind, name in final.values() if kind == "nice"],
    )


def missing_fields(
    *,
    title: str | None,
    type,
    field,
    city,
    format,
    description: str | None,
    apply_by,
    required_skills: list[str],
) -> list[str]:
    """What stops a vacancy from being published; names match the API (`incomplete.fields`)."""
    missing = []
    if not title or not title.strip():
        missing.append("title")
    for name, value in (("type", type), ("field", field), ("city", city), ("format", format)):
        if value is None:
            missing.append(name)
    if not description or not description.strip():
        missing.append("description")
    if apply_by is None:
        missing.append("apply_by")
    if not required_skills:
        missing.append("required_skills")
    return missing


def accepting_applications(vacancy: Vacancy, now: datetime) -> bool:
    return (
        vacancy.status == VacancyStatus.open
        and vacancy.closes_at is not None
        and vacancy.closes_at > now
    )


def visible_in_search(now: datetime | None = None):
    """SQL condition for student search — same rule as `accepting_applications`."""
    now = now or datetime.now(UTC)
    return and_(Vacancy.status == VacancyStatus.open, Vacancy.closes_at > now)


async def sweep_expired(db: AsyncSession, now: datetime) -> int:
    """Close every Open / Paused vacancy whose deadline passed. One indexed UPDATE; idempotent (research R1)."""
    result = await db.execute(
        update(Vacancy)
        .where(
            Vacancy.status.in_((VacancyStatus.open, VacancyStatus.paused)),
            Vacancy.closes_at <= now,
        )
        .values(
            status=VacancyStatus.closed,
            closed_by=ClosedBy.deadline,
            closed_at=Vacancy.closes_at,
            version=Vacancy.version + 1,
        )
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return result.rowcount
