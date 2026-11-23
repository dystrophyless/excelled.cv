"""The list of active opportunities (spec FR-001 … FR-004, research R1, R6)."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import event

from src.database import async_engine
from src.vacancies.deadlines import closes_at_for
from src.vacancies.models import VacancyStatus

from tests.vacancies.helpers import day

LIST = "/api/student/opportunities"
S = VacancyStatus
NOW = datetime.now(UTC)


async def fetch(client, account, **params):
    response = await client.get(LIST, params=params, headers=account.headers)
    assert response.status_code == 200, response.text
    return response.json()


def titles(body):
    return [item["title"] for item in body["items"]]


async def test_only_active_opportunities_are_listed(client, student_with_profile, employer, make_vacancy):
    await make_vacancy(employer, title="Open one", status=S.open)
    for status in (S.draft, S.paused, S.closed):
        await make_vacancy(employer, title=f"Not {status}", status=status)
    # past its deadline but not swept yet
    await make_vacancy(employer, title="Expired", status=S.open, apply_by=day(-3))

    body = await fetch(client, student_with_profile)
    assert titles(body) == ["Open one"]
    assert body["total"] == 1


async def test_it_disappears_at_the_deadline_instant(
    client, student_with_profile, employer, make_vacancy, freeze_now
):
    apply_by = day(5)
    await make_vacancy(employer, status=S.open, apply_by=apply_by)
    closes_at = closes_at_for(apply_by)

    freeze_now(closes_at - timedelta(seconds=1))
    assert (await fetch(client, student_with_profile))["total"] == 1
    freeze_now(closes_at)
    assert (await fetch(client, student_with_profile))["total"] == 0


async def test_nothing_is_listed_without_a_company_profile(
    client, student_with_profile, employer_without_profile, make_vacancy
):
    await make_vacancy(employer_without_profile, status=S.open)
    assert (await fetch(client, student_with_profile))["total"] == 0


async def test_an_item_carries_what_the_card_shows(client, student_with_profile, employer, make_vacancy):
    vacancy = await make_vacancy(
        employer, status=S.open, required=["SQL", "Python"], nice=["Docker"], duration="3 months", salary=None
    )
    item = (await fetch(client, student_with_profile))["items"][0]
    assert item["id"] == vacancy.id
    assert item["type"] == "internship"
    assert item["apply_by"] == vacancy.apply_by.isoformat()
    assert item["required_skills"] == ["SQL", "Python"]
    assert item["nice_skills"] == ["Docker"]
    assert (item["duration"], item["salary"]) == ("3 months", None)
    assert item["company"] == {"name": "Acme"}
    assert item["published_at"].endswith("Z")


async def test_changes_by_the_employer_show_on_the_next_read(
    client, student_with_profile, employer, make_vacancy
):
    vacancy = await make_vacancy(employer, status=S.open)
    path = f"/api/company/vacancies/{vacancy.id}"
    current = (await client.get(path, headers=employer.headers)).json()

    edited = await client.put(path, json=current | {"title": "Renamed"}, headers=employer.headers)
    assert titles(await fetch(client, student_with_profile)) == ["Renamed"]

    version = edited.json()["version"]
    await client.post(f"{path}/status", json={"action": "pause", "version": version}, headers=employer.headers)
    assert (await fetch(client, student_with_profile))["total"] == 0


async def test_newest_first_with_a_stable_order(client, student_with_profile, employer, make_vacancy):
    same = NOW - timedelta(days=2)
    await make_vacancy(employer, title="First", status=S.open, published_at=same)
    await make_vacancy(employer, title="Second", status=S.open, published_at=same)
    await make_vacancy(employer, title="Fresh", status=S.open, published_at=NOW)
    assert titles(await fetch(client, student_with_profile)) == ["Fresh", "Second", "First"]


async def test_closing_soonest_first(client, student_with_profile, employer, make_vacancy):
    await make_vacancy(employer, title="Later", status=S.open, apply_by=day(20))
    await make_vacancy(employer, title="Soon A", status=S.open, apply_by=day(2))
    await make_vacancy(employer, title="Soon B", status=S.open, apply_by=day(2))
    assert titles(await fetch(client, student_with_profile, sort="closing")) == ["Soon B", "Soon A", "Later"]


async def test_pages_of_ten_never_repeat_or_skip(client, student_with_profile, employer, make_vacancy):
    same = NOW - timedelta(days=1)
    for n in range(23):
        await make_vacancy(employer, title=f"Job {n}", status=S.open, published_at=same)

    pages = [await fetch(client, student_with_profile, page=n) for n in (1, 2, 3)]
    assert [len(p["items"]) for p in pages] == [10, 10, 3]
    assert {p["total"] for p in pages} == {23}
    assert {p["page_size"] for p in pages} == {10}
    ids = [item["id"] for p in pages for item in p["items"]]
    assert len(set(ids)) == 23


async def test_a_page_beyond_the_last_is_the_last(client, student_with_profile, employer, make_vacancy):
    for n in range(11):
        await make_vacancy(employer, title=f"Job {n}", status=S.open)
    for page in (99, 10**30):
        body = await fetch(client, student_with_profile, page=page)
        assert (body["page"], len(body["items"])) == (2, 1)


async def test_page_zero_is_refused(client, student_with_profile):
    response = await client.get(LIST, params={"page": 0}, headers=student_with_profile.headers)
    assert response.status_code == 422


async def test_the_empty_list(client, student_with_profile):
    body = await fetch(client, student_with_profile)
    assert body == {"items": [], "total": 0, "page": 1, "page_size": 10}


async def test_the_number_of_queries_does_not_grow_with_the_items(
    client, student_with_profile, employer, make_vacancy
):
    statements: list[str] = []

    def record(conn, cursor, statement, *args):
        statements.append(statement)

    async def count() -> int:
        statements.clear()
        await fetch(client, student_with_profile)
        return len(statements)

    await make_vacancy(employer, status=S.open)
    event.listen(async_engine.sync_engine, "before_cursor_execute", record)
    try:
        one = await count()
        for _ in range(8):
            await make_vacancy(employer, status=S.open)
        assert await count() == one
    finally:
        event.remove(async_engine.sync_engine, "before_cursor_execute", record)
