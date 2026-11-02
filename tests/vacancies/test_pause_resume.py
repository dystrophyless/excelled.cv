import pytest

from src.vacancies.models import VacancyStatus

from .helpers import URL, set_status

S = VacancyStatus


async def test_an_open_vacancy_can_be_paused(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)

    response = await set_status(client, employer, vacancy.id, "pause", vacancy.version)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "paused"
    assert body["version"] == vacancy.version + 1
    assert body["closed_by"] is None and body["closed_at"] is None


async def test_a_paused_vacancy_resumes_with_the_same_deadline(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)
    paused = (await set_status(client, employer, vacancy.id, "pause", vacancy.version)).json()

    response = await set_status(client, employer, vacancy.id, "resume", paused["version"])

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "open"
    assert body["apply_by"] == vacancy.apply_by.isoformat()
    assert body["closes_at"] == paused["closes_at"]


async def test_a_paused_vacancy_can_still_be_closed(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.paused)

    response = await set_status(client, employer, vacancy.id, "close", vacancy.version)

    assert response.status_code == 200
    assert response.json()["status"] == "closed"


@pytest.mark.parametrize("status", [S.paused, S.draft, S.closed])
async def test_only_an_open_vacancy_can_be_paused(client, employer, make_vacancy, status):
    vacancy = await make_vacancy(employer, status=status)

    response = await set_status(client, employer, vacancy.id, "pause", vacancy.version)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_transition" and detail["status"] == status.value


@pytest.mark.parametrize("status", [S.open, S.draft, S.closed])
async def test_only_a_paused_vacancy_can_be_resumed(client, employer, make_vacancy, status):
    vacancy = await make_vacancy(employer, status=status)

    response = await set_status(client, employer, vacancy.id, "resume", vacancy.version)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_transition" and detail["status"] == status.value


async def test_pausing_does_not_touch_the_content(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open, required=["Python"], nice=["Docker"])

    await set_status(client, employer, vacancy.id, "pause", vacancy.version)

    body = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()
    assert body["title"] == vacancy.title
    assert body["required_skills"] == ["Python"] and body["nice_skills"] == ["Docker"]
