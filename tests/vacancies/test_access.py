async def test_employer_endpoints_need_a_session(client):
    response = await client.get("/api/company/vacancies/1")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_signed_in"


async def test_a_student_cannot_reach_employer_endpoints(client, student):
    response = await client.get("/api/company/vacancies/1", headers=student.headers)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "wrong_role"


async def test_the_owner_reads_their_vacancy(client, employer, make_vacancy):
    vacancy = await make_vacancy(employer, required=["Python", "SQL"], nice=["Docker"])

    response = await client.get(f"/api/company/vacancies/{vacancy.id}", headers=employer.headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == vacancy.id
    assert body["title"] == "Backend Intern (Python)"
    assert body["status"] == "draft"
    assert body["required_skills"] == ["Python", "SQL"]
    assert body["nice_skills"] == ["Docker"]
    assert body["applicants"] == 0 and body["new_applicants"] == 0
    assert body["version"] == 1


async def test_another_employers_vacancy_looks_exactly_like_a_missing_one(
    client, employer, other_employer, make_vacancy
):
    theirs = await make_vacancy(other_employer)

    not_mine = await client.get(f"/api/company/vacancies/{theirs.id}", headers=employer.headers)
    missing = await client.get("/api/company/vacancies/999999", headers=employer.headers)

    assert not_mine.status_code == missing.status_code == 404
    assert not_mine.json() == missing.json()
    assert not_mine.json()["detail"]["code"] == "vacancy_not_found"


async def test_reading_a_vacancy_closes_it_when_its_deadline_has_passed(client, employer, make_vacancy):
    from datetime import date

    from src.vacancies.models import VacancyStatus

    vacancy = await make_vacancy(employer, status=VacancyStatus.open, apply_by=date(2026, 1, 5))

    response = await client.get(f"/api/company/vacancies/{vacancy.id}", headers=employer.headers)

    body = response.json()
    assert body["status"] == "closed"
    assert body["closed_by"] == "deadline"
