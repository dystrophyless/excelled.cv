"""One opportunity (spec FR-005, FR-007)."""

from src.catalog.enums import City, Currency, Industry, VacancyType
from src.users.models import UserRole
from src.vacancies.models import VacancyStatus

from tests.vacancies.helpers import day

LIST = "/api/student/opportunities"
S = VacancyStatus


async def test_everything_the_employer_published(
    client, student_with_profile, make_user, make_company_profile, make_vacancy
):
    owner = await make_user(email="lab@nu.edu.kz", role=UserRole.employer)
    await make_company_profile(
        owner, name="NU Lab", industry=Industry.education, city=City.astana, website="https://nu.edu.kz",
        description="A lab.",
    )  # fmt: skip
    vacancy = await make_vacancy(
        owner, status=S.open, type=VacancyType.research, required=["SQL", "Python"], nice=["R"], duration="1 semester",
        salary_min=150000, salary_currency=Currency.KZT,
    )  # fmt: skip

    response = await client.get(f"{LIST}/{vacancy.id}", headers=student_with_profile.headers)
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == vacancy.title
    assert body["type"] == "research"
    assert body["description"] == "Join the Payments team."
    assert (body["field"], body["city"], body["format"]) == ("backend", "almaty", "hybrid")
    assert (body["duration"], body["salary"]) == (
        "1 semester",
        {"min": 150000, "max": None, "currency": "KZT"},
    )
    assert body["apply_by"] == vacancy.apply_by.isoformat()
    assert (body["required_skills"], body["nice_skills"]) == (["SQL", "Python"], ["R"])
    assert body["company"] == {
        "name": "NU Lab",
        "industry": "education",
        "size": "11_50",
        "city": "astana",
        "website": "https://nu.edu.kz",
        "description": "A lab.",
    }


async def test_optional_fields_are_null(client, student_with_profile, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)
    body = (await client.get(f"{LIST}/{vacancy.id}", headers=student_with_profile.headers)).json()
    assert (body["duration"], body["salary"], body["nice_skills"]) == (None, None, [])
    assert {body["company"][k] for k in ("city", "website", "description")} == {None}


async def test_every_unavailable_opportunity_answers_the_same(
    client, student_with_profile, employer, employer_without_profile, make_vacancy
):
    vacancies = [await make_vacancy(employer, status=status) for status in (S.draft, S.paused, S.closed)]
    vacancies.append(await make_vacancy(employer, status=S.open, apply_by=day(-3)))
    vacancies.append(await make_vacancy(employer_without_profile, status=S.open))

    responses = [
        await client.get(f"{LIST}/{id_}", headers=student_with_profile.headers)
        for id_ in [v.id for v in vacancies] + [999999, 10**30]
    ]
    assert {r.status_code for r in responses} == {404}
    assert len({r.text for r in responses}) == 1
    assert responses[0].json()["detail"]["code"] == "opportunity_unavailable"


async def test_company_details_follow_the_profile(client, student_with_profile, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)
    await client.put(
        "/api/company/profile",
        json={"name": "Acme 2", "industry": "it", "size": "11_50", "version": 1},
        headers=employer.headers,
    )
    body = (await client.get(f"{LIST}/{vacancy.id}", headers=student_with_profile.headers)).json()
    assert body["company"]["name"] == "Acme 2"
