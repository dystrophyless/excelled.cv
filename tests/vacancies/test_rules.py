from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select

from src.vacancies import rules
from src.vacancies.deadlines import closes_at_for, is_future_deadline, today_kz
from src.vacancies.models import ClosedBy, Vacancy, VacancyStatus

S = VacancyStatus
A = rules.Action

NOW = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)


# ---- deadlines (research R2) -----------------------------------------------------------------


def test_closes_at_is_the_end_of_the_day_in_kazakhstan_time():
    assert closes_at_for(date(2026, 11, 30)) == datetime(2026, 11, 30, 19, 0, tzinfo=UTC)


def test_a_deadline_is_valid_all_of_its_last_day_utc_plus_5():
    last_minute = datetime(2026, 11, 30, 18, 59, tzinfo=UTC)  # 23:59 in UTC+5
    next_midnight = datetime(2026, 11, 30, 19, 0, tzinfo=UTC)  # 00:00 on 1 Dec in UTC+5

    assert is_future_deadline(date(2026, 11, 30), last_minute)
    assert not is_future_deadline(date(2026, 11, 30), next_midnight)
    assert is_future_deadline(date(2026, 12, 1), next_midnight)
    assert today_kz(next_midnight) == date(2026, 12, 1)


# ---- completeness ----------------------------------------------------------------------------

COMPLETE = dict(
    title="Backend Intern",
    type="internship",
    field="backend",
    city="almaty",
    format="hybrid",
    description="Join the team.",
    apply_by=date(2026, 12, 1),
    required_skills=["Python"],
)


def test_a_complete_vacancy_has_nothing_missing():
    assert rules.missing_fields(**COMPLETE) == []


def test_an_empty_draft_misses_everything_but_its_title():
    empty = dict(
        title="Backend Intern", type=None, field=None, city=None, format=None,
        description=None, apply_by=None, required_skills=[],
    )

    assert rules.missing_fields(**empty) == [
        "type", "field", "city", "format", "description", "apply_by", "required_skills",
    ]


def test_a_blank_description_counts_as_missing():
    assert rules.missing_fields(**{**COMPLETE, "description": "   "}) == ["description"]


# ---- skills ----------------------------------------------------------------------------------


def test_skills_are_deduplicated_ignoring_case():
    assert rules.resolve_skills(["Python", "python ", "PYTHON"], []) == (["Python"], [])


def test_a_skill_in_both_groups_stays_in_the_group_listed_last():
    assert rules.resolve_skills(["Python", "SQL"], ["python ", "Docker"]) == (["SQL"], ["Python", "Docker"])


# ---- transitions -----------------------------------------------------------------------------

ALLOWED = {
    A.publish: {S.draft},
    A.pause: {S.open},
    A.resume: {S.paused},
    A.close: {S.open, S.paused},
    A.reopen: {S.closed},
}


@pytest.mark.parametrize("action", list(A))
@pytest.mark.parametrize("status", list(S))
def test_every_action_is_allowed_only_from_its_statuses(action, status):
    assert rules.can_apply(action, status) is (status in ALLOWED[action])


def test_every_action_leads_to_the_agreed_status():
    assert rules.TARGET == {
        A.publish: S.open, A.pause: S.paused, A.resume: S.open, A.close: S.closed, A.reopen: S.open,
    }


# ---- accepting applications ------------------------------------------------------------------


@pytest.mark.parametrize(
    ("status", "closes_in", "expected"),
    [
        (S.open, timedelta(hours=1), True),
        (S.open, timedelta(seconds=-1), False),  # past its deadline even though no sweep ran yet
        (S.open, None, False),
        (S.paused, timedelta(days=3), False),
        (S.closed, timedelta(days=3), False),
        (S.draft, timedelta(days=3), False),
    ],
)
def test_only_an_open_vacancy_before_its_deadline_accepts_applications(status, closes_in, expected):
    vacancy = Vacancy(status=status, closes_at=None if closes_in is None else NOW + closes_in)

    assert rules.accepting_applications(vacancy, NOW) is expected


# ---- the sweep -------------------------------------------------------------------------------


async def test_the_sweep_closes_expired_open_and_paused_vacancies_only(db, employer, make_vacancy):
    past = date(2026, 10, 20)
    future = date(2026, 12, 20)
    expired_open = await make_vacancy(employer, title="Expired open", status=S.open, apply_by=past)
    expired_paused = await make_vacancy(employer, title="Expired paused", status=S.paused, apply_by=past)
    running = await make_vacancy(employer, title="Running", status=S.open, apply_by=future)
    old_draft = await make_vacancy(employer, title="Old draft", status=S.draft, apply_by=past)
    already_closed = await make_vacancy(employer, title="Closed", status=S.closed, apply_by=past)

    before = {
        v.title: (v.version, v.closes_at)
        for v in (expired_open, expired_paused, running, old_draft, already_closed)
    }

    changed = await rules.sweep_expired(db, NOW)

    assert changed == 2
    rows = {
        v.title: v
        for v in (await db.execute(select(Vacancy).execution_options(populate_existing=True))).scalars()
    }
    for title in ("Expired open", "Expired paused"):
        swept = rows[title]
        version, closes_at = before[title]
        assert swept.status == S.closed
        assert swept.closed_by == ClosedBy.deadline
        assert swept.closed_at == closes_at
        assert swept.version == version + 1
    assert rows["Running"].status == S.open and rows["Running"].version == before["Running"][0]
    assert rows["Old draft"].status == S.draft and rows["Old draft"].version == before["Old draft"][0]
    assert rows["Closed"].closed_by == ClosedBy.employer and rows["Closed"].version == before["Closed"][0]


async def test_the_sweep_is_idempotent(db, employer, make_vacancy):
    await make_vacancy(employer, status=S.open, apply_by=date(2026, 10, 20))

    assert await rules.sweep_expired(db, NOW) == 1
    assert await rules.sweep_expired(db, NOW) == 0
