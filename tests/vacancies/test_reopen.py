from datetime import date

import pytest

from src.vacancies.deadlines import closes_at_for
from src.vacancies.models import VacancyStatus

from .helpers import URL, day, set_status

S = VacancyStatus


async def reopen(client, employer, vacancy, **extra):
    return await set_status(client, employer, vacancy.id, "reopen", vacancy.version, **extra)


async def test_a_closed_vacancy_reopens_with_a_new_deadline(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.closed, apply_by=day(-3))
    new_deadline = day(30)

    response = await reopen(client, employer, vacancy, apply_by=new_deadline.isoformat())

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "open"
    assert body["apply_by"] == new_deadline.isoformat()
    assert body["closes_at"] == closes_at_for(new_deadline).isoformat().replace("+00:00", "Z")
    assert body["closed_at"] is None and body["closed_by"] is None
    assert body["published_at"] is not None  # still the first publication
    assert body["version"] == vacancy.version + 1


async def test_reopening_keeps_the_content_and_skills(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.closed, required=["Python"], nice=["Docker"])

    body = (await reopen(client, employer, vacancy, apply_by=day(10).isoformat())).json()

    assert body["title"] == vacancy.title
    assert body["required_skills"] == ["Python"] and body["nice_skills"] == ["Docker"]


@pytest.mark.parametrize("extra", [{}, {"apply_by": None}, {"apply_by": day(-1).isoformat()}])
async def test_reopening_needs_a_deadline_that_has_not_passed(client, employer, make_vacancy, extra):
    vacancy = await make_vacancy(employer, status=S.closed)

    response = await reopen(client, employer, vacancy, **extra)

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "apply_by_not_in_future"
    still = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()
    assert still["status"] == "closed"


async def test_today_is_a_valid_new_deadline(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.closed)

    response = await reopen(client, employer, vacancy, apply_by=day(0).isoformat())

    assert response.status_code == 200


@pytest.mark.parametrize("status", [S.open, S.paused, S.draft])
async def test_only_a_closed_vacancy_can_be_reopened(client, employer, make_vacancy, status):
    vacancy = await make_vacancy(employer, status=status)

    response = await reopen(client, employer, vacancy, apply_by=day(10).isoformat())

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_transition" and detail["status"] == status.value


async def test_a_vacancy_edited_into_an_incomplete_state_cannot_be_reopened(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.closed, complete=False, apply_by=date(2026, 1, 5))

    response = await reopen(client, employer, vacancy, apply_by=day(10).isoformat())

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "incomplete"
    assert "required_skills" in response.json()["detail"]["fields"]


async def test_reopening_an_expired_vacancy_closed_by_its_deadline_works(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open, apply_by=date(2026, 1, 5))  # swept to closed on first read
    swept = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()
    assert swept["status"] == "closed" and swept["closed_by"] == "deadline"

    response = await set_status(client, employer, vacancy.id, "reopen", swept["version"], apply_by=day(20).isoformat())

    assert response.status_code == 200
    assert response.json()["status"] == "open"
