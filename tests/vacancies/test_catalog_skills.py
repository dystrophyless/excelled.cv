from sqlalchemy import select

from src.skills.models import Skill
from src.skills.normalize import skill_key
from src.skills.repository import upsert_skills


async def test_the_catalog_is_public_and_complete(client):
    response = await client.get("/api/catalog")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"types", "fields", "cities", "formats"}
    assert {"value": "full_time", "label": "Full-time"} in body["types"]
    assert {"value": "on_site", "label": "On-site"} in body["formats"]
    assert [o["value"] for o in body["types"]] == ["internship", "full_time", "part_time"]
    assert {"value": "almaty", "label": "Almaty"} in body["cities"]
    assert {"value": "qa", "label": "QA"} in body["fields"]


async def test_skill_suggestions_need_a_session(client):
    response = await client.get("/api/skills?q=py")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_signed_in"


async def test_skill_suggestions_match_the_start_of_a_name(client, db, employer):
    await upsert_skills(db, ["Python", "PyTorch", "SQL", "Spark"])
    await db.commit()

    response = await client.get("/api/skills?q=Py", headers=employer.headers)

    assert response.status_code == 200
    assert response.json() == {"skills": ["Python", "PyTorch"]}


async def test_skill_suggestions_work_for_students_too(client, db, student):
    await upsert_skills(db, ["Docker"])
    await db.commit()

    response = await client.get("/api/skills?q=d", headers=student.headers)

    assert response.json() == {"skills": ["Docker"]}


async def test_suggestions_without_a_query_are_capped_at_ten(client, db, employer):
    await upsert_skills(db, [f"Skill {i:02d}" for i in range(15)])
    await db.commit()

    response = await client.get("/api/skills", headers=employer.headers)

    assert len(response.json()["skills"]) == 10


async def test_one_skill_in_different_spellings_is_stored_once(db):
    first = await upsert_skills(db, ["Python", " python ", "PYTHON"])
    second = await upsert_skills(db, ["python"])
    await db.commit()

    rows = (await db.execute(select(Skill))).scalars().all()
    assert len(rows) == 1
    assert rows[0].key == skill_key("Python") == "python"
    assert list(first) == list(second) == ["python"]
    assert first["python"].id == second["python"].id
