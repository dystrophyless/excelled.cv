"""The rules the future applying / search features must reuse (spec FR-009, FR-017; research R8)."""

from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select

from src.vacancies import rules
from src.vacancies.deadlines import closes_at_for
from src.vacancies.models import ClosedBy, Vacancy, VacancyStatus

from .helpers import day

S = VacancyStatus
NOW = datetime.now(UTC)


async def visible_titles(db, now=NOW) -> list[str]:
    rows = await db.execute(select(Vacancy.title).where(rules.visible_in_search(now)).order_by(Vacancy.title))
    return list(rows.scalars().all())


@pytest.mark.parametrize(
    ("status", "closed_by"),
    [
        (S.draft, None),
        (S.paused, None),
        (S.closed, ClosedBy.employer),
        (S.closed, ClosedBy.deadline),
    ],
)
async def test_nothing_but_an_open_vacancy_accepts_applications_or_shows_in_search(
    db, employer, make_vacancy, status, closed_by
):
    vacancy = await make_vacancy(employer, status=status, apply_by=day(10))
    if closed_by is not None:
        vacancy.closed_by = closed_by
        await db.commit()

    assert not rules.accepting_applications(vacancy, NOW)
    assert await visible_titles(db) == []


async def test_an_open_vacancy_before_its_deadline_accepts_applications_and_shows_in_search(db, employer, make_vacancy):
    vacancy = await make_vacancy(employer, title="Visible", status=S.open, apply_by=day(10))

    assert rules.accepting_applications(vacancy, NOW)
    assert await visible_titles(db) == ["Visible"]


async def test_search_and_applications_stop_at_the_same_instant(db, employer, make_vacancy):
    vacancy = await make_vacancy(employer, title="Edge", status=S.open, apply_by=date(2026, 12, 10))
    deadline = closes_at_for(date(2026, 12, 10))

    just_before = deadline - timedelta(seconds=1)
    assert rules.accepting_applications(vacancy, just_before)
    assert await visible_titles(db, just_before) == ["Edge"]
    assert not rules.accepting_applications(vacancy, deadline)
    assert await visible_titles(db, deadline) == []


async def test_only_the_open_ones_among_many_are_visible(db, employer, other_employer, make_vacancy):
    await make_vacancy(employer, title="A open", status=S.open, apply_by=day(5))
    await make_vacancy(employer, title="B paused", status=S.paused, apply_by=day(5))
    await make_vacancy(other_employer, title="C open", status=S.open, apply_by=day(5))
    await make_vacancy(other_employer, title="D draft", status=S.draft, apply_by=day(5))
    await make_vacancy(other_employer, title="E closed", status=S.closed, apply_by=day(5))

    assert await visible_titles(db) == ["A open", "C open"]
