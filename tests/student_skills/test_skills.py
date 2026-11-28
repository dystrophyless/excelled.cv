"""GET / PUT /api/student/skills: the student's own skill list (US-18 groundwork, 007)."""

import pytest
from sqlalchemy import delete, select

from src.profiles.models import StudentProfile
from src.skills.models import Skill
from src.student_skills.models import SkillSource, StudentSkill

from tests.conftest import Account, cookie
from tests.profiles.helpers import error_locs

URL = "/api/student/skills"


async def save(client, account, skills):
    return await client.put(URL, json={"skills": skills}, headers=account.headers)


async def names(client, account):
    return [item["name"] for item in (await client.get(URL, headers=account.headers)).json()["skills"]]


# ---- access --------------------------------------------------------------------------------------


@pytest.mark.parametrize("method", ["GET", "PUT"])
async def test_a_guest_is_not_signed_in(client, method):
    response = await client.request(method, URL, json={"skills": []} if method == "PUT" else None)
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_signed_in"


@pytest.mark.parametrize("method", ["GET", "PUT"])
async def test_an_employer_is_refused(client, employer, method):
    response = await client.request(
        method, URL, json={"skills": []} if method == "PUT" else None, headers=employer.headers
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "wrong_role"


@pytest.mark.parametrize("method", ["GET", "PUT"])
async def test_a_student_needs_a_profile(client, student, method):
    response = await client.request(method, URL, json={"skills": []} if method == "PUT" else None, headers=student.headers)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "student_profile_required"


async def test_a_foreign_origin_is_refused(client, student_with_profile):
    response = await client.put(
        URL,
        json={"skills": ["Python"]},
        headers={**student_with_profile.headers, "Origin": "https://evil.example"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "origin_not_allowed"
    assert await names(client, student_with_profile) == []


# ---- reading and saving ---------------------------------------------------------------------------


async def test_a_new_student_has_no_skills(client, student_with_profile):
    response = await client.get(URL, headers=student_with_profile.headers)
    assert response.status_code == 200
    assert response.json() == {"skills": [], "max_skills": 30}
    assert response.headers["cache-control"] == "no-store"


async def test_saved_skills_come_back_in_order_as_manual_and_confirmed(client, student_with_profile):
    response = await save(client, student_with_profile, ["Python", "SQL", "Docker"])
    assert response.status_code == 200
    assert response.json()["skills"] == [
        {"name": "Python", "source": "manual", "confirmed": True},
        {"name": "SQL", "source": "manual", "confirmed": True},
        {"name": "Docker", "source": "manual", "confirmed": True},
    ]
    assert await names(client, student_with_profile) == ["Python", "SQL", "Docker"]


async def test_saving_replaces_the_list(client, student_with_profile):
    await save(client, student_with_profile, ["Python", "SQL", "Docker"])
    await save(client, student_with_profile, ["SQL", "Git"])
    assert await names(client, student_with_profile) == ["SQL", "Git"]


async def test_saving_an_empty_list_clears_the_skills(client, student_with_profile):
    await save(client, student_with_profile, ["Python"])
    assert (await save(client, student_with_profile, [])).json()["skills"] == []
    assert await names(client, student_with_profile) == []


async def test_a_skill_typed_twice_is_kept_once(client, student_with_profile):
    response = await save(client, student_with_profile, ["Python", " python ", "PYTHON", "SQL"])
    assert [item["name"] for item in response.json()["skills"]] == ["Python", "SQL"]


async def test_inner_whitespace_is_collapsed(client, student_with_profile):
    response = await save(client, student_with_profile, ["Machine    Learning"])
    assert response.json()["skills"][0]["name"] == "Machine Learning"


# ---- the shared vocabulary -------------------------------------------------------------------------


async def test_a_skill_already_used_by_a_vacancy_is_the_same_skill(client, db, employer, make_vacancy, student_with_profile):
    await make_vacancy(employer, required=["Python"])
    await save(client, student_with_profile, ["python"])

    skills = (await db.scalars(select(Skill).where(Skill.key == "python"))).all()
    assert len(skills) == 1  # one vocabulary entry for both sides
    assert skills[0].name == "Python"  # the first display form wins
    assert await names(client, student_with_profile) == ["Python"]


async def test_two_students_share_a_skill_without_seeing_each_other(
    client, make_user, make_session, make_student_profile, student_with_profile
):
    other_user = await make_user(email="dana@kbtu.kz")
    _, raw = await make_session(other_user)
    await make_student_profile(other_user)
    other = Account(user=other_user, headers=cookie(raw))

    await save(client, student_with_profile, ["Python", "SQL"])
    await save(client, other, ["Python", "Figma"])

    assert await names(client, student_with_profile) == ["Python", "SQL"]
    assert await names(client, other) == ["Python", "Figma"]


# ---- review: a CV skill is confirmed by saving it ---------------------------------------------------


async def test_saving_confirms_a_cv_skill_and_keeps_its_source(client, db, student_with_profile):
    await save(client, student_with_profile, ["Python"])  # makes the vocabulary entries
    profile_id = await db.scalar(select(StudentProfile.id))
    skill_id = await db.scalar(select(Skill.id).where(Skill.key == "python"))
    await db.execute(
        StudentSkill.__table__.update()
        .where(StudentSkill.profile_id == profile_id, StudentSkill.skill_id == skill_id)
        .values(source=SkillSource.cv, confirmed=False)
    )
    await db.commit()

    before = (await client.get(URL, headers=student_with_profile.headers)).json()["skills"]
    assert before == [{"name": "Python", "source": "cv", "confirmed": False}]

    after = (await save(client, student_with_profile, ["Python", "SQL"])).json()["skills"]
    assert after == [
        {"name": "Python", "source": "cv", "confirmed": True},
        {"name": "SQL", "source": "manual", "confirmed": True},
    ]


async def test_a_cv_skill_left_out_of_the_saved_list_is_removed(client, db, student_with_profile):
    await save(client, student_with_profile, ["Python", "SQL"])
    await save(client, student_with_profile, ["SQL"])
    assert await names(client, student_with_profile) == ["SQL"]


# ---- validation -------------------------------------------------------------------------------------


async def test_an_empty_or_blank_name_is_refused(client, student_with_profile):
    await save(client, student_with_profile, ["Python"])
    for bad in ("", "   "):
        response = await save(client, student_with_profile, ["SQL", bad])
        assert response.status_code == 422
        assert error_locs(response) == [("skills", 1)]
    assert await names(client, student_with_profile) == ["Python"]  # nothing was overwritten


async def test_a_name_of_41_characters_is_refused_and_40_is_fine(client, student_with_profile):
    assert (await save(client, student_with_profile, ["x" * 41])).status_code == 422
    assert (await save(client, student_with_profile, ["x" * 40])).status_code == 200


async def test_more_than_30_skills_are_refused_and_30_are_fine(client, student_with_profile):
    many = [f"Skill {number}" for number in range(31)]
    response = await save(client, student_with_profile, many)
    assert response.status_code == 422
    assert error_locs(response) == [("skills",)]
    assert (await save(client, student_with_profile, many[:30])).status_code == 200
    assert len(await names(client, student_with_profile)) == 30


async def test_a_body_without_skills_is_refused(client, student_with_profile):
    response = await client.put(URL, json={}, headers=student_with_profile.headers)
    assert response.status_code == 422


# ---- lifecycle --------------------------------------------------------------------------------------


async def test_the_skills_are_deleted_with_the_profile_but_the_vocabulary_stays(client, db, student_with_profile):
    await save(client, student_with_profile, ["Python", "SQL"])
    await db.execute(delete(StudentProfile))
    await db.commit()

    assert (await db.scalars(select(StudentSkill))).all() == []
    assert len((await db.scalars(select(Skill))).all()) == 2
