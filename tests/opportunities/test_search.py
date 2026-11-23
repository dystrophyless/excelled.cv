"""Search and filters (spec FR-008 … FR-010, research R3, R4)."""

import pytest

from src.catalog.enums import City, VacancyField, VacancyType, WorkFormat
from src.vacancies.models import VacancyStatus

LIST = "/api/student/opportunities"
S = VacancyStatus
T = VacancyType


@pytest.fixture
async def search(client, student_with_profile):
    async def _search(**params) -> set[str]:
        response = await client.get(LIST, params=params, headers=student_with_profile.headers)
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["total"] == len(body["items"])
        return {item["title"] for item in body["items"]}

    return _search


@pytest.fixture
async def jobs(employer, other_employer, make_vacancy):
    await make_vacancy(employer, title="Backend Intern", status=S.open, required=["Python"], nice=["Docker"])
    await make_vacancy(
        employer, title="Data Engineer", status=S.open, type=T.full_time, field=VacancyField.data_engineering,
        city=City.astana, format=WorkFormat.remote, required=["SQL"],
    )  # fmt: skip
    await make_vacancy(
        other_employer, title="QA Helper", status=S.open, type=T.part_time, field=VacancyField.qa,
        city=City.shymkent, format=WorkFormat.on_site, required=["Selenium"],
    )  # fmt: skip
    await make_vacancy(
        other_employer, title="Vision Lab", status=S.open, type=T.research, field=VacancyField.data_science,
        city=City.astana, format=WorkFormat.on_site, required=["PyTorch", "Python"],
    )  # fmt: skip
    await make_vacancy(employer, title="Closed Python Intern", status=S.closed)


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("", {"Backend Intern", "Data Engineer", "QA Helper", "Vision Lab"}),
        ("backend", {"Backend Intern"}),
        ("  BACKEND   intern ", {"Backend Intern"}),
        ("other co", {"QA Helper", "Vision Lab"}),  # company name
        ("pytho", {"Backend Intern", "Vision Lab"}),  # required skill
        ("docker", {"Backend Intern"}),  # nice-to-have skill
        ("python lab", {"Vision Lab"}),  # words in different places
        ("lab python", {"Vision Lab"}),
        ("acme sql engineer", {"Data Engineer"}),
        ("payments", set()),  # the description is not searched
        ("blockchain", set()),
    ],
)
async def test_keyword(search, jobs, q, expected):
    assert await search(q=q) == expected


@pytest.mark.parametrize("symbol", ["%", "_", "\\"])
async def test_like_symbols_are_literal(search, employer, make_vacancy, symbol):
    await make_vacancy(employer, title="Plain", status=S.open)
    await make_vacancy(employer, title=f"With {symbol} sign", status=S.open)
    assert await search(q=symbol) == {f"With {symbol} sign"}


async def test_a_long_keyword_is_refused(client, student_with_profile):
    ok = await client.get(LIST, params={"q": "a" * 120}, headers=student_with_profile.headers)
    assert ok.status_code == 200
    refused = await client.get(LIST, params={"q": "a" * 121}, headers=student_with_profile.headers)
    assert refused.status_code == 422


async def test_a_keyword_with_a_null_character_finds_nothing(search, jobs):
    assert await search(q="py\x00thon") == set()


@pytest.mark.parametrize(
    ("type_", "expected"),
    [
        ("internship", {"Backend Intern"}),
        ("vacancy", {"Data Engineer", "QA Helper"}),
        ("research", {"Vision Lab"}),
    ],
)
async def test_type(search, jobs, type_, expected):
    assert await search(type=type_) == expected


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"format": "remote"}, {"Data Engineer"}),
        ({"format": ["remote", "hybrid"]}, {"Data Engineer", "Backend Intern"}),
        ({"city": "astana"}, {"Data Engineer", "Vision Lab"}),
        ({"city": ["almaty", "shymkent"]}, {"Backend Intern", "QA Helper"}),
        ({"field": ["qa", "data_science"]}, {"QA Helper", "Vision Lab"}),
        ({"city": "astana", "format": "on_site"}, {"Vision Lab"}),
        ({"q": "python", "type": "research", "city": "astana", "format": "on_site", "field": "data_science"}, {"Vision Lab"}),
        ({"q": "python", "type": "vacancy"}, set()),
        ({"city": "aktobe"}, set()),
    ],
)
async def test_filters_combine(search, jobs, params, expected):
    assert await search(**params) == expected


@pytest.mark.parametrize("name", ["type", "format", "city", "field", "sort"])
async def test_unknown_values_are_refused(client, student_with_profile, name):
    response = await client.get(LIST, params={name: "bogus"}, headers=student_with_profile.headers)
    assert response.status_code == 422


async def test_a_job_type_is_not_a_filter_value(client, student_with_profile):
    response = await client.get(LIST, params={"type": "full_time"}, headers=student_with_profile.headers)
    assert response.status_code == 422
