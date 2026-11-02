from datetime import UTC, date, datetime, timedelta

from sqlalchemy import update

from src.vacancies.models import Vacancy, VacancyStatus

S = VacancyStatus
URL = "/api/company/vacancies"


async def titles(client, employer, **params) -> list[str]:
    response = await client.get(URL, params=params, headers=employer.headers)
    assert response.status_code == 200
    return [item["title"] for item in response.json()["items"]]


async def test_the_list_needs_an_employer_session(client, student):
    assert (await client.get(URL)).status_code == 401
    assert (await client.get(URL, headers=student.headers)).status_code == 403


async def test_an_employer_with_no_vacancies_gets_an_empty_list(client, employer):
    response = await client.get(URL, headers=employer.headers)

    assert response.status_code == 200
    assert response.json() == {
        "items": [],
        "counts": {"all": 0, "draft": 0, "open": 0, "paused": 0, "closed": 0},
    }


async def test_each_employer_sees_only_their_own_vacancies(client, employer, other_employer, make_vacancy):
    await make_vacancy(employer, title="Mine one")
    await make_vacancy(employer, title="Mine two", status=S.open)
    await make_vacancy(other_employer, title="Theirs", status=S.open)

    assert sorted(await titles(client, employer)) == ["Mine one", "Mine two"]
    assert await titles(client, other_employer) == ["Theirs"]
    counts = (await client.get(URL, headers=other_employer.headers)).json()["counts"]
    assert counts["all"] == 1


async def test_the_status_filter_returns_one_group(client, employer, make_vacancy):
    await make_vacancy(employer, title="D", status=S.draft)
    await make_vacancy(employer, title="O1", status=S.open)
    await make_vacancy(employer, title="O2", status=S.open)
    await make_vacancy(employer, title="P", status=S.paused)
    await make_vacancy(employer, title="C", status=S.closed)

    assert sorted(await titles(client, employer, status="open")) == ["O1", "O2"]
    assert await titles(client, employer, status="draft") == ["D"]
    assert await titles(client, employer, status="paused") == ["P"]
    assert await titles(client, employer, status="closed") == ["C"]
    assert len(await titles(client, employer, status="all")) == 5
    assert len(await titles(client, employer)) == 5  # "all" is the default


async def test_an_unknown_status_is_a_validation_error(client, employer):
    response = await client.get(URL, params={"status": "archived"}, headers=employer.headers)

    assert response.status_code == 422


async def test_search_matches_part_of_a_title_ignoring_case_within_the_group(client, employer, make_vacancy):
    await make_vacancy(employer, title="Backend Intern (Python)", status=S.open)
    await make_vacancy(employer, title="Data Analyst INTERN", status=S.open)
    await make_vacancy(employer, title="Junior Data Engineer", status=S.draft)
    await make_vacancy(employer, title="Intern for later", status=S.draft)

    assert sorted(await titles(client, employer, q="intern")) == [
        "Backend Intern (Python)", "Data Analyst INTERN", "Intern for later",
    ]
    assert sorted(await titles(client, employer, q="intern", status="open")) == [
        "Backend Intern (Python)", "Data Analyst INTERN",
    ]
    assert await titles(client, employer, q="DATA", status="draft") == ["Junior Data Engineer"]
    assert await titles(client, employer, q="nothing like this") == []


async def test_search_treats_percent_and_underscore_literally(client, employer, make_vacancy):
    await make_vacancy(employer, title="100% remote role")
    await make_vacancy(employer, title="Backend Intern")

    assert await titles(client, employer, q="100%") == ["100% remote role"]
    assert await titles(client, employer, q="%") == ["100% remote role"]
    assert await titles(client, employer, q="_") == []


async def test_counts_ignore_the_search_text_and_the_selected_group(client, employer, make_vacancy):
    await make_vacancy(employer, title="Alpha", status=S.open)
    await make_vacancy(employer, title="Beta", status=S.open)
    await make_vacancy(employer, title="Gamma", status=S.draft)
    await make_vacancy(employer, title="Delta", status=S.closed)

    response = await client.get(URL, params={"status": "open", "q": "alpha"}, headers=employer.headers)

    body = response.json()
    assert [item["title"] for item in body["items"]] == ["Alpha"]
    assert body["counts"] == {"all": 4, "draft": 1, "open": 2, "paused": 0, "closed": 1}


async def test_the_most_recently_changed_vacancy_comes_first(client, employer, db, make_vacancy):
    first = await make_vacancy(employer, title="First")
    second = await make_vacancy(employer, title="Second")
    third = await make_vacancy(employer, title="Third")
    base = datetime.now(UTC)
    for vacancy, minutes in ((first, 30), (second, 10), (third, 20)):
        await db.execute(
            update(Vacancy).where(Vacancy.id == vacancy.id).values(updated_at=base - timedelta(minutes=minutes))
        )
    await db.commit()

    assert await titles(client, employer) == ["Second", "Third", "First"]


async def test_an_expired_open_vacancy_is_already_closed_in_the_list(client, employer, make_vacancy):
    await make_vacancy(employer, title="Past deadline", status=S.open, apply_by=date(2026, 1, 5))
    await make_vacancy(employer, title="Still running", status=S.open)

    body = (await client.get(URL, headers=employer.headers)).json()

    by_title = {item["title"]: item for item in body["items"]}
    assert by_title["Past deadline"]["status"] == "closed"
    assert by_title["Past deadline"]["closed_by"] == "deadline"
    assert by_title["Still running"]["status"] == "open"
    assert body["counts"]["closed"] == 1 and body["counts"]["open"] == 1


async def test_list_items_carry_their_skills(client, employer, make_vacancy):
    await make_vacancy(employer, required=["Python", "SQL"], nice=["Docker"])

    item = (await client.get(URL, headers=employer.headers)).json()["items"][0]

    assert item["required_skills"] == ["Python", "SQL"]
    assert item["nice_skills"] == ["Docker"]
    assert item["applicants"] == 0 and item["new_applicants"] == 0
