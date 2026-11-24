"""Salary as monthly amounts and a currency (004 spec FR-020..FR-022, research R12)."""

import pytest
from sqlalchemy import text

from src.catalog.enums import Currency
from src.scripts.create_tables import upgrade_salary
from src.vacancies.models import Vacancy, VacancyStatus

from .helpers import URL, complete, create, set_status

STUDENT_LIST = "/api/student/opportunities"
S = VacancyStatus


# ---- catalog ---------------------------------------------------------------------------------


async def test_the_catalog_lists_currencies_with_symbols(client):
    assert (await client.get("/api/catalog")).json()["currencies"] == [
        {"value": "KZT", "label": "Tenge", "symbol": "₸"},
        {"value": "USD", "label": "US dollar", "symbol": "$"},
        {"value": "EUR", "label": "Euro", "symbol": "€"},
        {"value": "RUB", "label": "Russian ruble", "symbol": "₽"},
    ]
    assert [c.value for c in Currency] == ["KZT", "USD", "EUR", "RUB"]


# ---- input -----------------------------------------------------------------------------------


async def test_a_range_is_stored_and_returned(client, employer):
    response = await create(client, employer, **complete(salary={"min": 200000, "max": 300000, "currency": "USD"}))

    assert response.status_code == 201
    assert response.json()["salary"] == {"min": 200000, "max": 300000, "currency": "USD"}


async def test_the_currency_defaults_to_tenge(client, employer):
    response = await create(client, employer, **complete(salary={"min": 1000000, "max": None}))

    assert response.json()["salary"] == {"min": 1000000, "max": None, "currency": "KZT"}


async def test_one_amount_is_enough_and_equal_amounts_are_allowed(client, employer):
    only_max = await create(client, employer, **complete(salary={"max": 300000}))
    equal = await create(client, employer, **complete(salary={"min": 5, "max": 5}))

    assert only_max.json()["salary"] == {"min": None, "max": 300000, "currency": "KZT"}
    assert equal.json()["salary"] == {"min": 5, "max": 5, "currency": "KZT"}


@pytest.mark.parametrize(
    "salary", [None, {}, {"min": None, "max": None}, {"min": None, "max": None, "currency": "EUR"}]
)
async def test_no_amounts_means_no_salary(client, employer, salary):
    response = await create(client, employer, **complete(salary=salary))

    assert response.status_code == 201
    assert response.json()["salary"] is None


async def test_a_missing_salary_means_no_salary(client, employer):
    body = complete()
    del body["salary"]

    assert (await create(client, employer, **body)).json()["salary"] is None


@pytest.mark.parametrize("amount", [1, 999999999])
async def test_the_amount_limits_are_inclusive(client, employer, amount):
    response = await create(client, employer, **complete(salary={"min": amount}))

    assert response.status_code == 201
    assert response.json()["salary"]["min"] == amount


@pytest.mark.parametrize("amount", [0, -5, 1000000000, "100", 1.5, 100.0, True, [], {}])
@pytest.mark.parametrize("side", ["min", "max"])
async def test_an_invalid_amount_is_refused_at_its_field(client, employer, side, amount):
    response = await create(client, employer, **complete(salary={side: amount}))

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][:3] == ["body", "salary", side]


async def test_min_above_max_is_refused_at_max(client, employer):
    response = await create(client, employer, **complete(salary={"min": 300000, "max": 200000}))

    assert response.status_code == 422
    assert [error["loc"] for error in response.json()["detail"]] == [["body", "salary", "max"]]


@pytest.mark.parametrize("salary", ["200 000 ₸ / month", "100", 100, [1, 2]])
async def test_a_text_salary_is_refused(client, employer, salary):
    response = await create(client, employer, **complete(salary=salary))

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][:2] == ["body", "salary"]


@pytest.mark.parametrize("currency", ["GBP", "kzt", "", None])
async def test_an_unknown_currency_is_refused(client, employer, currency):
    response = await create(client, employer, **complete(salary={"min": 100, "currency": currency}))

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "salary", "currency"]


async def test_the_same_rules_apply_to_edit(client, employer):
    created = (await create(client, employer, **complete())).json()

    response = await client.put(
        f"{URL}/{created['id']}",
        json=complete(salary={"min": 10, "max": 5}, version=created["version"]),
        headers=employer.headers,
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "salary", "max"]


# ---- draft, edit, publish --------------------------------------------------------------------


async def test_a_draft_keeps_its_salary(client, employer):
    created = (await create(client, employer, title="Backend Intern", salary={"min": 100, "currency": "EUR"})).json()

    fetched = (await client.get(f"{URL}/{created['id']}", headers=employer.headers)).json()
    listed = (await client.get(URL, headers=employer.headers)).json()["items"][0]

    assert fetched["salary"] == listed["salary"] == {"min": 100, "max": None, "currency": "EUR"}


async def test_editing_changes_the_currency(client, employer):
    created = (await create(client, employer, **complete(salary={"min": 100, "currency": "EUR"}))).json()

    response = await client.put(
        f"{URL}/{created['id']}",
        json=complete(salary={"min": 100, "max": 200, "currency": "RUB"}, version=created["version"]),
        headers=employer.headers,
    )

    assert response.json()["salary"] == {"min": 100, "max": 200, "currency": "RUB"}


async def test_clearing_the_salary_resets_the_stored_currency(client, employer, db):
    created = (await create(client, employer, **complete(salary={"min": 100, "currency": "USD"}))).json()

    response = await client.put(
        f"{URL}/{created['id']}",
        json=complete(salary={"min": None, "max": None, "currency": "USD"}, version=created["version"]),
        headers=employer.headers,
    )

    assert response.json()["salary"] is None
    row = (await db.execute(text("SELECT salary_min, salary_max, salary_currency FROM vacancies"))).one()
    assert tuple(row) == (None, None, "KZT")


async def test_the_salary_survives_publish_pause_resume_and_close(client, employer):
    created = (await create(client, employer, **complete(salary={"min": 100, "max": 200, "currency": "EUR"}))).json()
    version = created["version"]

    for action in ("publish", "pause", "resume", "close"):
        response = await set_status(client, employer, created["id"], action, version)
        assert response.status_code == 200, action
        assert response.json()["salary"] == {"min": 100, "max": 200, "currency": "EUR"}
        version = response.json()["version"]


async def test_publishing_on_create_returns_the_salary(client, employer):
    response = await create(client, employer, **complete(publish=True, salary={"min": 100}))

    assert response.json()["status"] == "open"
    assert response.json()["salary"] == {"min": 100, "max": None, "currency": "KZT"}


# ---- student endpoints -----------------------------------------------------------------------


async def test_students_see_the_salary_object_in_list_and_details(
    client, student_with_profile, employer, make_vacancy
):
    vacancy = await make_vacancy(
        employer, status=S.open, salary_min=200000, salary_max=300000, salary_currency=Currency.USD
    )
    expected = {"min": 200000, "max": 300000, "currency": "USD"}

    listed = (await client.get(STUDENT_LIST, headers=student_with_profile.headers)).json()["items"][0]
    detail = (await client.get(f"{STUDENT_LIST}/{vacancy.id}", headers=student_with_profile.headers)).json()

    assert listed["salary"] == detail["salary"] == expected


async def test_students_see_null_without_amounts(client, student_with_profile, employer, make_vacancy):
    vacancy = await make_vacancy(employer, status=S.open)

    listed = (await client.get(STUDENT_LIST, headers=student_with_profile.headers)).json()["items"][0]
    detail = (await client.get(f"{STUDENT_LIST}/{vacancy.id}", headers=student_with_profile.headers)).json()

    assert listed["salary"] is None and detail["salary"] is None


async def test_the_database_refuses_amounts_that_break_the_rules(db, employer):
    employer_id = employer.user.id

    async def insert(values: str):
        await db.execute(
            text(f"INSERT INTO vacancies (employer_id, title, {values[0]}) VALUES (:e, 'Backend', {values[1]})"),
            {"e": employer_id},
        )

    for columns, amounts in (
        ("salary_min", "0"),
        ("salary_max", "1000000000"),
        ("salary_min, salary_max", "10, 5"),
    ):
        with pytest.raises(Exception, match="ck_vacancies_salary"):
            await insert((columns, amounts))
        await db.rollback()


# ---- upgrade of text salaries (FR-022) -------------------------------------------------------


@pytest.fixture
async def legacy_column(db):
    """The pre-0.5.0 text column, which a fresh database does not have; removed again afterwards."""
    await db.execute(text("ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS salary varchar(60)"))
    await db.commit()
    yield
    await db.rollback()
    await db.execute(text("ALTER TABLE vacancies DROP COLUMN IF EXISTS salary"))
    await db.commit()


async def _insert_legacy(db, employer, salary: str | None) -> int:
    row = await db.execute(
        text("INSERT INTO vacancies (employer_id, title, salary) VALUES (:e, 'Backend Intern', :s) RETURNING id"),
        {"e": employer.user.id, "s": salary},
    )
    vacancy_id = row.scalar_one()
    await db.commit()
    return vacancy_id


async def _stored(db, vacancy_id: int):
    row = (
        await db.execute(
            text("SELECT salary_min, salary_max, salary_currency, salary FROM vacancies WHERE id = :i"),
            {"i": vacancy_id},
        )
    ).one()
    await db.rollback()  # end the read's transaction: its lock would block the upgrade's ALTER TABLE
    return tuple(row)


@pytest.mark.parametrize(
    ("old", "amount"),
    [
        ("200 000 ₸ / month", 200000),
        ("200000", 200000),
        ("1 000 000 ₸", 1000000),
        ("150000 KZT", 150000),
        ("150 000 тг", 150000),
        ("150 000 тг / MONTH", 150000),
        ("200 000 ₸", 200000),
        ("999 999 999", 999999999),
        ("1", 1),
    ],
)
async def test_a_plain_amount_becomes_tenge_and_the_text_is_cleared(db, employer, legacy_column, old, amount):
    vacancy_id = await _insert_legacy(db, employer, old)

    unconverted = await upgrade_salary()

    assert unconverted == []
    assert await _stored(db, vacancy_id) == (amount, amount, "KZT", None)


@pytest.mark.parametrize("old", ["from 200k", "negotiable", "200 000 - 300 000 ₸", "1 000 000 000", "0", "$500", "1.5"])
async def test_other_texts_stay_untouched_and_are_reported(db, employer, legacy_column, old):
    vacancy_id = await _insert_legacy(db, employer, old)

    unconverted = await upgrade_salary()

    assert unconverted == [(vacancy_id, old)]
    assert await _stored(db, vacancy_id) == (None, None, "KZT", old)


async def test_rows_without_a_text_are_left_alone(db, employer, legacy_column):
    vacancy_id = await _insert_legacy(db, employer, None)

    assert await upgrade_salary() == []
    assert await _stored(db, vacancy_id) == (None, None, "KZT", None)


async def test_running_twice_changes_nothing(db, employer, legacy_column):
    converted = await _insert_legacy(db, employer, "200 000 ₸")
    kept = await _insert_legacy(db, employer, "negotiable")
    await upgrade_salary()
    before = [await _stored(db, converted), await _stored(db, kept)]

    again = await upgrade_salary()

    assert again == [(kept, "negotiable")]
    assert [await _stored(db, converted), await _stored(db, kept)] == before


async def test_a_salary_the_employer_cleared_does_not_come_back(client, db, employer, legacy_column):
    vacancy_id = await _insert_legacy(db, employer, "200 000 ₸")
    await upgrade_salary()
    version = (await client.get(f"{URL}/{vacancy_id}", headers=employer.headers)).json()["version"]
    assert (await client.get(f"{URL}/{vacancy_id}", headers=employer.headers)).json()["salary"] == {
        "min": 200000,
        "max": 200000,
        "currency": "KZT",
    }

    cleared = await client.put(
        f"{URL}/{vacancy_id}", json={"title": "Backend Intern", "salary": None, "version": version}, headers=employer.headers
    )
    assert cleared.json()["salary"] is None
    await upgrade_salary()

    assert (await client.get(f"{URL}/{vacancy_id}", headers=employer.headers)).json()["salary"] is None


async def test_a_salary_entered_after_the_upgrade_is_not_overwritten(db, employer, legacy_column, make_vacancy):
    vacancy = await make_vacancy(employer, salary_min=5, salary_max=6, salary_currency=Currency.EUR)
    await db.execute(text("UPDATE vacancies SET salary = '200 000' WHERE id = :i"), {"i": vacancy.id})
    await db.commit()

    await upgrade_salary()

    assert await _stored(db, vacancy.id) == (5, 6, "EUR", "200 000")


async def test_an_old_database_without_the_new_columns_is_upgraded(db, employer):
    """The state before 0.5.0: text column only, no amounts, no currency column, no constraints."""
    await db.execute(
        text(
            "ALTER TABLE vacancies DROP COLUMN salary_min, DROP COLUMN salary_max, DROP COLUMN salary_currency,"
            " ADD COLUMN salary varchar(60)"
        )
    )
    await db.commit()
    try:
        vacancy_id = await _insert_legacy(db, employer, "300 000 ₸ / month")
        other_id = await _insert_legacy(db, employer, "by agreement")

        assert await upgrade_salary() == [(other_id, "by agreement")]
        assert await _stored(db, vacancy_id) == (300000, 300000, "KZT", None)
        assert await _stored(db, other_id) == (None, None, "KZT", "by agreement")
        constraints = (
            await db.execute(text("SELECT conname FROM pg_constraint WHERE conname LIKE 'ck_vacancies_salary%'"))
        ).scalars().all()
        await db.rollback()
        assert sorted(constraints) == [
            "ck_vacancies_salary_max_range",
            "ck_vacancies_salary_min_range",
            "ck_vacancies_salary_order",
        ]
    finally:
        await db.rollback()
        await db.execute(text("ALTER TABLE vacancies DROP COLUMN IF EXISTS salary"))
        await db.commit()


async def test_a_fresh_database_has_nothing_to_convert(db):
    columns = (
        await db.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name = 'vacancies'")
        )
    ).scalars().all()
    await db.rollback()
    assert "salary" not in columns

    assert await upgrade_salary() == []
    assert await upgrade_salary() == []
    assert Vacancy.__table__.c.salary_currency.default.arg == Currency.KZT
