"""has_profile on the account (research R2) and the vacancy gate (FR-015, research R4)."""

import pytest

from .helpers import COMPANY_URL, STUDENT_URL, company_body, student_body

VACANCIES = "/api/company/vacancies"


async def test_me_reports_whether_the_account_has_a_profile(client, student, employer_without_profile):
    for account in (student, employer_without_profile):
        assert (await client.get("/api/auth/me", headers=account.headers)).json()["account"]["has_profile"] is False

    await client.post(STUDENT_URL, json=student_body(), headers=student.headers)
    await client.post(COMPANY_URL, json=company_body(), headers=employer_without_profile.headers)

    for account in (student, employer_without_profile):
        assert (await client.get("/api/auth/me", headers=account.headers)).json()["account"]["has_profile"] is True


async def test_sign_in_reports_has_profile(client, make_user):
    await make_user(email="new@sdu.edu.kz", password="correct-horse")

    response = await client.post("/api/auth/token", data={"username": "new@sdu.edu.kz", "password": "correct-horse"})

    assert response.json()["account"]["has_profile"] is False


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", VACANCIES, None),
        ("POST", VACANCIES, {"title": "Backend Intern"}),
        ("GET", f"{VACANCIES}/1", None),
        ("PUT", f"{VACANCIES}/1", {"title": "Backend Intern", "version": 1}),
        ("POST", f"{VACANCIES}/1/status", {"action": "pause", "version": 1}),
        ("DELETE", f"{VACANCIES}/1?version=1", None),
    ],
)
async def test_an_employer_without_a_company_profile_cannot_work_with_vacancies(
    client, employer_without_profile, method, path, body
):
    response = await client.request(method, path, json=body, headers=employer_without_profile.headers)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "company_profile_required"


async def test_the_role_check_comes_before_the_profile_check(client, student):
    response = await client.get(VACANCIES, headers=student.headers)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "wrong_role"


async def test_after_saving_the_company_profile_vacancies_open(client, employer_without_profile):
    headers = employer_without_profile.headers
    await client.post(COMPANY_URL, json=company_body(), headers=headers)

    assert (await client.get(VACANCIES, headers=headers)).status_code == 200
