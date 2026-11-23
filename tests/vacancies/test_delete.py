import pytest
from sqlalchemy import func, select

from src.skills.models import Skill
from src.vacancies.models import Vacancy, VacancySkill, VacancyStatus

from .helpers import URL

S = VacancyStatus


async def delete(client, account, vacancy, version=None):
    return await client.delete(
        f"{URL}/{vacancy.id}",
        params={"version": vacancy.version if version is None else version},
        headers=account.headers,
    )


async def count(db, model) -> int:
    return (await db.execute(select(func.count()).select_from(model))).scalar_one()


async def test_a_draft_can_be_deleted_with_its_skills(client, employer, db, make_vacancy):
    vacancy = await make_vacancy(employer, required=["Python", "SQL"], nice=["Docker"])
    assert await count(db, VacancySkill) == 3

    response = await delete(client, employer, vacancy)

    assert response.status_code == 204
    assert response.content == b""
    assert await count(db, Vacancy) == 0
    assert await count(db, VacancySkill) == 0
    assert await count(db, Skill) == 3  # the shared skill names stay for other vacancies
    assert (await client.get(f"{URL}/{vacancy.id}", headers=employer.headers)).status_code == 404


@pytest.mark.parametrize("status", [S.open, S.paused, S.closed])
async def test_a_published_vacancy_cannot_be_deleted(client, employer, db, make_vacancy, status):
    vacancy = await make_vacancy(employer, status=status)

    response = await delete(client, employer, vacancy)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "not_a_draft"
    assert detail["status"] == status.value
    assert await count(db, Vacancy) == 1


async def test_deleting_with_a_stale_version_is_a_conflict(client, employer, db, make_vacancy):
    vacancy = await make_vacancy(employer)
    renamed = await client.put(
        f"{URL}/{vacancy.id}",
        json={"title": "Renamed draft", "version": vacancy.version},
        headers=employer.headers,
    )
    assert renamed.status_code == 200

    response = await delete(client, employer, vacancy)  # still carries the old version

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "version_conflict"
    assert detail["vacancy"]["title"] == "Renamed draft"
    assert await count(db, Vacancy) == 1


async def test_someone_elses_draft_cannot_be_deleted(client, employer, other_employer, db, make_vacancy):
    vacancy = await make_vacancy(employer)

    response = await delete(client, other_employer, vacancy)

    assert response.status_code == 404
    assert await count(db, Vacancy) == 1


async def test_a_missing_vacancy_is_not_found(client, employer):
    response = await client.delete(f"{URL}/999999", params={"version": 1}, headers=employer.headers)

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "vacancy_not_found"


async def test_a_student_cannot_delete(client, student, employer, make_vacancy):
    vacancy = await make_vacancy(employer)

    response = await client.delete(f"{URL}/{vacancy.id}", params={"version": 1}, headers=student.headers)

    assert response.status_code == 403
