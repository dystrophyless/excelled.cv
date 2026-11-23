"""Who may read opportunities and what leaves the API (spec FR-001, FR-016, FR-017)."""

import pytest

from src.vacancies.models import VacancyStatus

LIST = "/api/student/opportunities"
ITEM_KEYS = {
    "id", "title", "type", "field", "city", "format", "duration", "salary", "apply_by", "published_at",
    "required_skills", "nice_skills", "company",
}  # fmt: skip


@pytest.mark.parametrize("path", [LIST, f"{LIST}/1"])
async def test_a_guest_is_not_signed_in(client, path):
    response = await client.get(path)
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_signed_in"


@pytest.mark.parametrize("path", [LIST, f"{LIST}/1"])
async def test_an_employer_is_refused(client, employer, path):
    response = await client.get(path, headers=employer.headers)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "wrong_role"


@pytest.mark.parametrize("path", [LIST, f"{LIST}/1"])
async def test_a_student_needs_a_profile(client, student, path):
    response = await client.get(path, headers=student.headers)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "student_profile_required"


async def test_only_the_contract_fields_are_sent(client, student_with_profile, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=VacancyStatus.open)

    item = (await client.get(LIST, headers=student_with_profile.headers)).json()["items"][0]
    assert set(item) == ITEM_KEYS
    assert set(item["company"]) == {"name"}

    detail = (await client.get(f"{LIST}/{vacancy.id}", headers=student_with_profile.headers)).json()
    assert set(detail) == ITEM_KEYS | {"description"}
    assert set(detail["company"]) == {"name", "industry", "size", "city", "website", "description"}
