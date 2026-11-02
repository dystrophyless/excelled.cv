from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from src.vacancies import rules
from src.vacancies.models import Vacancy, VacancyStatus

from .helpers import URL, set_status

S = VacancyStatus


@pytest.mark.parametrize("status", [S.open, S.paused])
async def test_an_open_or_paused_vacancy_can_be_closed(client, employer, make_vacancy, status):
    vacancy = await make_vacancy(employer, status=status)

    response = await set_status(client, employer, vacancy.id, "close", vacancy.version)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "closed"
    assert body["closed_by"] == "employer"
    closed_at = datetime.fromisoformat(body["closed_at"])
    assert abs(datetime.now(UTC) - closed_at) < timedelta(minutes=1)
    assert body["version"] == vacancy.version + 1
    assert body["published_at"] is not None  # the publication time stays


@pytest.mark.parametrize("status", [S.draft, S.closed])
async def test_a_draft_or_closed_vacancy_cannot_be_closed(client, employer, make_vacancy, status):
    vacancy = await make_vacancy(employer, status=status)

    response = await set_status(client, employer, vacancy.id, "close", vacancy.version)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_transition"
    assert detail["status"] == status.value


async def test_closing_with_a_stale_version_is_a_conflict(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)
    await set_status(client, employer, vacancy.id, "pause", vacancy.version)  # bumps the version

    response = await set_status(client, employer, vacancy.id, "close", vacancy.version)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "version_conflict"
    assert detail["vacancy"]["status"] == "paused"


async def test_someone_elses_vacancy_cannot_be_closed(client, other_employer, make_vacancy, employer):
    vacancy = await make_vacancy(employer, status=S.open)

    response = await set_status(client, other_employer, vacancy.id, "close", vacancy.version)

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "vacancy_not_found"


async def test_a_closed_vacancy_no_longer_takes_applications_or_shows_in_search(client, employer, db, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)
    now = datetime.now(UTC)
    assert rules.accepting_applications(vacancy, now)
    assert vacancy.id in (await db.execute(select(Vacancy.id).where(rules.visible_in_search(now)))).scalars().all()

    await set_status(client, employer, vacancy.id, "close", vacancy.version)

    closed = (
        await db.execute(select(Vacancy).where(Vacancy.id == vacancy.id).execution_options(populate_existing=True))
    ).scalar_one()
    assert not rules.accepting_applications(closed, now)
    assert (await db.execute(select(Vacancy.id).where(rules.visible_in_search(now)))).scalars().all() == []


async def test_closing_leaves_the_content_untouched(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open, required=["Python"], nice=["Docker"])

    body = (await set_status(client, employer, vacancy.id, "close", vacancy.version)).json()

    assert body["title"] == vacancy.title
    assert body["required_skills"] == ["Python"] and body["nice_skills"] == ["Docker"]
    assert body["apply_by"] == vacancy.apply_by.isoformat()
    again = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()
    assert again["status"] == "closed"
