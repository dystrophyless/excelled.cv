import pytest

from src.vacancies.models import VacancyStatus

from .helpers import URL, complete, day

S = VacancyStatus


async def put(client, account, vacancy, **changes):
    body = complete(version=vacancy.version, title=vacancy.title) | changes
    return await client.put(f"{URL}/{vacancy.id}", json=body, headers=account.headers)


@pytest.mark.parametrize("status", [S.open, S.paused, S.closed])
async def test_editing_keeps_the_status(client, employer, make_vacancy, status):
    vacancy = await make_vacancy(employer, status=status)

    response = await put(client, employer, vacancy, title="Renamed", city="astana")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == status.value
    assert body["title"] == "Renamed" and body["city"] == "astana"
    assert body["version"] == vacancy.version + 1


async def test_an_open_vacancy_cannot_lose_a_required_field(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)

    response = await put(client, employer, vacancy, description="   ", required_skills=[], nice_skills=["Docker"])

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "incomplete"
    assert detail["fields"] == ["description", "required_skills"]
    unchanged = (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).json()
    assert unchanged["description"] == vacancy.description and unchanged["version"] == vacancy.version


@pytest.mark.parametrize("status", [S.open, S.paused])
async def test_an_open_or_paused_vacancy_cannot_get_a_past_deadline(client, employer, make_vacancy, status):
    vacancy = await make_vacancy(employer, status=status)

    response = await put(client, employer, vacancy, apply_by=day(-1).isoformat())

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "apply_by_not_in_future"


async def test_a_closed_vacancy_may_keep_its_past_deadline_while_being_edited(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.closed, apply_by=day(-10))

    response = await put(client, employer, vacancy, title="Typo fixed", apply_by=day(-10).isoformat())

    assert response.status_code == 200
    assert response.json()["title"] == "Typo fixed"


async def test_changing_the_deadline_moves_the_closing_instant(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)

    body = (await put(client, employer, vacancy, apply_by=day(30).isoformat())).json()

    assert body["apply_by"] == day(30).isoformat()
    assert body["closes_at"] > vacancy.closes_at.isoformat().replace("+00:00", "Z")


async def test_the_second_of_two_edits_made_from_the_same_version_conflicts(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)

    first = await put(client, employer, vacancy, title="Edited in tab one")
    second = await put(client, employer, vacancy, title="Edited in tab two")

    assert first.status_code == 200
    assert second.status_code == 409
    detail = second.json()["detail"]
    assert detail["code"] == "version_conflict"
    assert detail["vacancy"]["title"] == "Edited in tab one"
    assert detail["vacancy"]["version"] == vacancy.version + 1


async def test_another_employer_cannot_edit_it(client, other_employer, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)

    response = await put(client, other_employer, vacancy, title="Hijacked")

    assert response.status_code == 404
