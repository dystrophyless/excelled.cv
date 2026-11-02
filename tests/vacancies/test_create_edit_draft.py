from datetime import datetime

import pytest
from sqlalchemy import select

from src.skills.models import Skill
from src.vacancies.deadlines import closes_at_for
from src.vacancies.models import Vacancy, VacancyStatus

from .helpers import URL, complete, create, day, set_status


# ---- POST: create ----------------------------------------------------------------------------


async def test_a_draft_needs_only_a_title(client, employer):
    response = await create(client, employer, title="Backend Intern")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"
    assert body["version"] == 1
    assert body["published_at"] is None
    assert body["closes_at"] is None and body["apply_by"] is None
    assert body["required_skills"] == [] and body["nice_skills"] == []
    assert body["closed_at"] is None and body["closed_by"] is None


@pytest.mark.parametrize("title", ["ab", "a" * 121, "  x "])
async def test_the_title_must_be_3_to_120_characters(client, employer, title):
    response = await create(client, employer, title=title)

    assert response.status_code == 422


async def test_publishing_on_create_opens_the_vacancy(client, employer):
    deadline = day(14)

    response = await create(client, employer, **complete(publish=True))

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "open"
    assert body["published_at"] is not None
    assert body["apply_by"] == deadline.isoformat()
    assert body["closes_at"] == closes_at_for(deadline).isoformat().replace("+00:00", "Z")
    assert body["required_skills"] == ["Python", "SQL"]
    assert body["nice_skills"] == ["Docker"]
    assert body["duration"] == "3 months" and body["salary"] == "200 000 ₸ / month"


async def test_publishing_an_incomplete_vacancy_names_what_is_missing(client, employer, db):
    response = await create(client, employer, title="Backend Intern", publish=True, required_skills=[])

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "incomplete"
    assert detail["fields"] == ["type", "field", "city", "format", "description", "apply_by", "required_skills"]
    assert (await db.execute(select(Vacancy))).scalars().all() == []  # nothing was saved


async def test_publishing_with_a_past_deadline_is_refused(client, employer):
    response = await create(client, employer, **complete(publish=True, apply_by=day(-1).isoformat()))

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "apply_by_not_in_future"


async def test_today_is_still_a_valid_deadline(client, employer):
    response = await create(client, employer, **complete(publish=True, apply_by=day(0).isoformat()))

    assert response.status_code == 201


async def test_a_draft_may_keep_any_deadline(client, employer):
    response = await create(client, employer, title="Backend Intern", apply_by=day(-5).isoformat())

    assert response.status_code == 201
    assert response.json()["apply_by"] == day(-5).isoformat()


async def test_more_than_ten_skills_in_a_group_is_refused(client, employer):
    skills = [f"Skill {i}" for i in range(11)]

    assert (await create(client, employer, title="Backend Intern", required_skills=skills)).status_code == 422
    assert (await create(client, employer, title="Backend Intern", nice_skills=skills)).status_code == 422


async def test_skills_are_deduplicated_and_never_in_both_groups(client, employer, db):
    response = await create(
        client,
        employer,
        title="Backend Intern",
        required_skills=["Python", "python ", "SQL"],
        nice_skills=["Docker", "PYTHON"],
    )

    body = response.json()
    assert body["required_skills"] == ["SQL"]
    assert body["nice_skills"] == ["Python", "Docker"]  # a skill in both groups stays in the one listed last
    assert len((await db.execute(select(Skill))).scalars().all()) == 3


async def test_a_vacancy_belongs_to_the_account_that_created_it(client, employer, other_employer):
    created = (await create(client, employer, title="Backend Intern")).json()

    mine = await client.get(f"{URL}/{created['id']}", headers=employer.headers)
    theirs = await client.get(f"{URL}/{created['id']}", headers=other_employer.headers)

    assert mine.status_code == 200
    assert theirs.status_code == 404


# ---- PUT: edit a draft -----------------------------------------------------------------------


async def test_editing_a_draft_replaces_its_content_and_skills(client, employer):
    created = (await create(client, employer, **complete())).json()

    response = await client.put(
        f"{URL}/{created['id']}",
        json=complete(
            title="Frontend Intern",
            city="astana",
            required_skills=["React"],
            nice_skills=[],
            salary=None,
            version=created["version"],
        ),
        headers=employer.headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "draft"
    assert body["version"] == created["version"] + 1
    assert body["title"] == "Frontend Intern" and body["city"] == "astana"
    assert body["required_skills"] == ["React"] and body["nice_skills"] == []
    assert body["salary"] is None


async def test_editing_with_a_stale_version_returns_the_current_vacancy(client, employer):
    created = (await create(client, employer, **complete())).json()
    first = await client.put(
        f"{URL}/{created['id']}", json=complete(title="First edit", version=created["version"]), headers=employer.headers
    )

    second = await client.put(
        f"{URL}/{created['id']}", json=complete(title="Second edit", version=created["version"]), headers=employer.headers
    )

    assert first.status_code == 200
    assert second.status_code == 409
    detail = second.json()["detail"]
    assert detail["code"] == "version_conflict"
    assert detail["vacancy"]["title"] == "First edit"
    assert detail["vacancy"]["version"] == created["version"] + 1


async def test_editing_someone_elses_vacancy_is_not_found(client, employer, other_employer):
    created = (await create(client, employer, **complete())).json()

    response = await client.put(
        f"{URL}/{created['id']}", json=complete(version=created["version"]), headers=other_employer.headers
    )

    assert response.status_code == 404


# ---- POST /status: publish -------------------------------------------------------------------


async def test_a_complete_draft_can_be_published(client, employer):
    created = (await create(client, employer, **complete())).json()

    response = await set_status(client, employer, created["id"], "publish", created["version"])

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "open"
    assert body["published_at"] is not None
    assert body["version"] == created["version"] + 1


async def test_an_incomplete_draft_cannot_be_published(client, employer):
    created = (await create(client, employer, title="Backend Intern", city="almaty")).json()

    response = await set_status(client, employer, created["id"], "publish", created["version"])

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == "incomplete"
    assert "city" not in detail["fields"] and "type" in detail["fields"]
    still = await client.get(f"{URL}/{created['id']}", headers=employer.headers)
    assert still.json()["status"] == "draft"


async def test_a_draft_with_a_past_deadline_cannot_be_published(client, employer):
    created = (await create(client, employer, **complete(apply_by=day(-2).isoformat()))).json()

    response = await set_status(client, employer, created["id"], "publish", created["version"])

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "apply_by_not_in_future"


async def test_only_a_draft_can_be_published(client, employer):
    opened = (await create(client, employer, **complete(publish=True))).json()

    response = await set_status(client, employer, opened["id"], "publish", opened["version"])

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_transition"
    assert detail["status"] == "open"
    assert "open" in detail["message"].lower()


async def test_publishing_with_a_stale_version_is_a_conflict(client, employer):
    created = (await create(client, employer, **complete())).json()
    await client.put(
        f"{URL}/{created['id']}", json=complete(title="Edited", version=created["version"]), headers=employer.headers
    )

    response = await set_status(client, employer, created["id"], "publish", created["version"])

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "version_conflict"
    assert detail["vacancy"]["title"] == "Edited" and detail["vacancy"]["status"] == "draft"


async def test_publishing_keeps_the_first_publication_time(client, employer, db):
    created = (await create(client, employer, **complete())).json()

    published = (await set_status(client, employer, created["id"], "publish", created["version"])).json()

    row = (await db.execute(select(Vacancy).execution_options(populate_existing=True))).scalar_one()
    assert row.status == VacancyStatus.open
    assert row.published_at is not None
    assert datetime.fromisoformat(published["published_at"]) == row.published_at  # the same instant
