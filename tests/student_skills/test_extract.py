"""POST /api/student/skills/extract: skills found in the student's CV, stored for review (US-17)."""

import pytest
from sqlalchemy import select

from src.skills.models import Skill
from src.skills.vocabulary import ENTRIES

from tests.conftest import Account, cookie
from tests.cv.helpers import CV_URL, name_header, pdf_bytes, upload
from tests.student_skills.helpers import CV_LINES, real_docx, real_pdf

URL = "/api/student/skills/extract"
SKILLS = "/api/student/skills"

CV_SKILLS = ["Python", "SQL", "Docker", "React", "REST API", "FastAPI", "PostgreSQL"]


async def extract(client, account):
    return await client.post(URL, headers=account.headers)


async def stored_skills(client, account):
    return (await client.get(SKILLS, headers=account.headers)).json()["skills"]


async def upload_cv(client, account, data: bytes, name: str = "cv.docx"):
    response = await upload(client, account, data, name)
    assert response.status_code == 201, response.text
    return response.json()


# ---- access --------------------------------------------------------------------------------------


async def test_a_guest_is_not_signed_in(client):
    response = await client.post(URL)
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_signed_in"


async def test_an_employer_is_refused(client, employer):
    response = await extract(client, employer)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "wrong_role"


async def test_a_student_needs_a_profile(client, student):
    response = await extract(client, student)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "student_profile_required"


async def test_a_foreign_origin_is_refused(client, student_with_profile):
    response = await client.post(URL, headers={**student_with_profile.headers, "Origin": "https://evil.example"})
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "origin_not_allowed"


async def test_without_a_cv_there_is_nothing_to_read(client, student_with_profile):
    response = await extract(client, student_with_profile)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "cv_required"


async def test_another_students_cv_is_never_read(client, make_user, make_session, make_student_profile, student_with_profile):
    await upload_cv(client, student_with_profile, real_docx(CV_LINES))

    other_user = await make_user(email="dana@kbtu.kz")
    _, raw = await make_session(other_user)
    await make_student_profile(other_user)
    other = Account(user=other_user, headers=cookie(raw))

    response = await extract(client, other)
    assert (response.status_code, response.json()["detail"]["code"]) == (409, "cv_required")
    assert await stored_skills(client, other) == []


# ---- reading ---------------------------------------------------------------------------------------


async def test_the_skills_of_a_docx_cv_are_stored_for_review(client, student_with_profile):
    await upload_cv(client, student_with_profile, real_docx(CV_LINES))

    response = await extract(client, student_with_profile)
    assert response.status_code == 200
    body = response.json()
    assert set(body["added"]) == set(CV_SKILLS)
    assert body["truncated"] is False
    assert all(item["source"] == "cv" and item["confirmed"] is False for item in body["skills"])
    assert {item["name"] for item in body["skills"]} == set(CV_SKILLS)
    assert body["skills"] == await stored_skills(client, student_with_profile)


async def test_the_skills_of_a_pdf_cv_are_stored_too(client, student_with_profile):
    await upload_cv(client, student_with_profile, real_pdf(CV_LINES), "cv.pdf")

    response = await extract(client, student_with_profile)
    assert response.status_code == 200
    assert set(response.json()["added"]) == set(CV_SKILLS)


async def test_the_most_mentioned_skills_come_first(client, student_with_profile):
    lines = ["Aruzhan Test, student. Docker once. Python, Python and Python again. SQL twice, SQL."]
    await upload_cv(client, student_with_profile, real_docx(lines))

    response = await extract(client, student_with_profile)
    assert [item["name"] for item in response.json()["skills"]] == ["Python", "SQL", "Docker"]


async def test_a_cv_with_no_known_skills_adds_nothing(client, student_with_profile):
    await upload_cv(client, student_with_profile, real_docx(["I enjoy hiking, chess and cooking dinner for my friends."]))

    response = await extract(client, student_with_profile)
    assert response.status_code == 200
    assert response.json()["added"] == []
    assert response.json()["skills"] == []


async def test_a_cv_without_text_is_unreadable(client, db, student_with_profile):
    await upload_cv(client, student_with_profile, pdf_bytes(), "scan.pdf")  # valid PDF marker, no text at all

    response = await extract(client, student_with_profile)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "cv_unreadable"
    assert await stored_skills(client, student_with_profile) == []


async def test_a_nearly_empty_docx_is_unreadable(client, student_with_profile):
    await upload_cv(client, student_with_profile, real_docx(["Hi"]))
    response = await extract(client, student_with_profile)
    assert (response.status_code, response.json()["detail"]["code"]) == (422, "cv_unreadable")


async def test_skills_employers_already_use_are_found_too(client, employer, make_vacancy, student_with_profile):
    await make_vacancy(employer, required=["Terraform", "Looker"])
    await upload_cv_text(client, student_with_profile, ["Aruzhan Test. Built dashboards in Looker and cloud setups in Terraform."])

    response = await extract(client, student_with_profile)
    assert set(response.json()["added"]) == {"Looker", "Terraform"}


async def upload_cv_text(client, account, lines):
    return await upload_cv(client, account, real_docx(lines))


# ---- the student's own skills are never touched ----------------------------------------------------


async def test_skills_the_student_already_has_are_left_alone(client, student_with_profile):
    await client.put(SKILLS, json={"skills": ["Python", "Figma"]}, headers=student_with_profile.headers)
    await upload_cv(client, student_with_profile, real_docx(CV_LINES))

    response = await extract(client, student_with_profile)
    skills = {item["name"]: item for item in response.json()["skills"]}

    assert skills["Python"] == {"name": "Python", "source": "manual", "confirmed": True}  # not re-added, not changed
    assert skills["Figma"] == {"name": "Figma", "source": "manual", "confirmed": True}  # not in the CV, kept
    assert "Python" not in response.json()["added"]
    assert {"SQL", "Docker", "React"} <= set(response.json()["added"])
    assert [item["name"] for item in response.json()["skills"]][:2] == ["Python", "Figma"]  # their order stays


async def test_reading_twice_gives_the_same_list(client, student_with_profile):
    await upload_cv(client, student_with_profile, real_docx(CV_LINES))
    first = (await extract(client, student_with_profile)).json()
    second = (await extract(client, student_with_profile)).json()
    assert second["skills"] == first["skills"]
    assert len(second["skills"]) == len(CV_SKILLS)


async def test_a_confirmed_cv_skill_survives_a_new_reading(client, student_with_profile):
    await upload_cv(client, student_with_profile, real_docx(CV_LINES))
    await extract(client, student_with_profile)
    await client.put(SKILLS, json={"skills": ["Python"]}, headers=student_with_profile.headers)  # review: keep Python

    response = await extract(client, student_with_profile)
    skills = {item["name"]: item for item in response.json()["skills"]}
    assert skills["Python"] == {"name": "Python", "source": "cv", "confirmed": True}
    assert "Python" not in response.json()["added"]


async def test_a_new_cv_replaces_the_unreviewed_guesses_of_the_old_one(client, student_with_profile):
    cv = await upload_cv(client, student_with_profile, real_docx(["Aruzhan Test. Python, SQL and Docker, a first CV."]))
    await extract(client, student_with_profile)

    replaced = await client.put(
        f"{CV_URL}/{cv['id']}",
        content=real_docx(["Aruzhan Test. Java and Kotlin with Android, a second and newer CV."]),
        headers={**student_with_profile.headers, **name_header("cv2.docx")},
    )
    assert replaced.status_code == 200

    response = await extract(client, student_with_profile)
    assert {item["name"] for item in response.json()["skills"]} == {"Java", "Kotlin", "Android"}


async def test_removing_the_cv_keeps_the_skills_but_a_new_reading_needs_a_cv(client, student_with_profile):
    cv = await upload_cv(client, student_with_profile, real_docx(CV_LINES))
    await extract(client, student_with_profile)
    await client.delete(f"{CV_URL}/{cv['id']}", headers=student_with_profile.headers)

    assert len(await stored_skills(client, student_with_profile)) == len(CV_SKILLS)
    assert (await extract(client, student_with_profile)).json()["detail"]["code"] == "cv_required"


# ---- limits and the vocabulary ----------------------------------------------------------------------


async def test_the_list_stops_at_30_skills_and_says_so(client, student_with_profile):
    names = [entry.name for entry in ENTRIES if not entry.exact_case and entry.terms and entry.terms[0] == entry.name.lower()][:40]
    assert len(names) == 40
    await upload_cv(client, student_with_profile, real_docx(["Aruzhan Test, skills: " + ", ".join(names)]))

    response = await extract(client, student_with_profile)
    body = response.json()
    assert len(body["skills"]) == 30
    assert body["truncated"] is True
    assert body["added"] == names[:30]  # all mentioned once: the order of appearance decides


async def test_room_left_by_the_students_own_skills_is_respected(client, student_with_profile):
    own = [f"Own skill {n}" for n in range(28)]
    await client.put(SKILLS, json={"skills": own}, headers=student_with_profile.headers)
    await upload_cv(client, student_with_profile, real_docx(CV_LINES))

    body = (await extract(client, student_with_profile)).json()
    assert len(body["skills"]) == 30
    assert len(body["added"]) == 2
    assert body["truncated"] is True
    assert [item["name"] for item in body["skills"]][:28] == own


async def test_found_skills_join_the_shared_vocabulary_once(client, db, employer, make_vacancy, student_with_profile):
    await make_vacancy(employer, required=["python"])  # an employer typed it in lower case first
    await upload_cv(client, student_with_profile, real_docx(CV_LINES))
    await extract(client, student_with_profile)

    python = (await db.scalars(select(Skill).where(Skill.key == "python"))).all()
    assert len(python) == 1
    assert python[0].name == "python"  # the first display form wins
    assert "python" in [item["name"] for item in await stored_skills(client, student_with_profile)]


async def test_skills_that_were_not_stored_do_not_pollute_the_vocabulary(client, db, student_with_profile):
    names = [entry.name for entry in ENTRIES if not entry.exact_case and entry.terms and entry.terms[0] == entry.name.lower()][:40]
    await upload_cv(client, student_with_profile, real_docx(["Aruzhan Test, skills: " + ", ".join(names)]))
    await extract(client, student_with_profile)

    in_vocabulary = {skill.name for skill in (await db.scalars(select(Skill))).all()}
    assert in_vocabulary == set(names[:30])
