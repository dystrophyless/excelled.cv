"""DELETE /api/student/cv/{id}: conditional on the CV the student saw."""

import uuid

import pytest
from sqlalchemy import select

from src.profiles.models import StudentProfile

from tests.conftest import Account, cookie
from tests.cv.helpers import CV_URL, pdf_bytes, stored, upload


async def remove(client, account, cv_id, **headers):
    return await client.delete(f"{CV_URL}/{cv_id}", headers={**account.headers, **headers})


async def test_the_cv_is_removed_and_the_profile_stays(client, db, student_with_profile):
    cv = (await upload(client, student_with_profile, pdf_bytes())).json()
    profile = (await db.scalars(select(StudentProfile))).one()
    version, updated = profile.version, profile.updated_at

    response = await remove(client, student_with_profile, cv["id"])
    assert (response.status_code, response.content) == (204, b"")
    assert await stored(db) == []
    assert (await client.get(CV_URL, headers=student_with_profile.headers)).json()["cv"] is None
    assert (await client.get(f"{CV_URL}/{cv['id']}/file", headers=student_with_profile.headers)).status_code == 409

    db.expire_all()
    profile = (await db.scalars(select(StudentProfile))).one()
    assert (profile.version, profile.updated_at) == (version, updated)


async def test_a_repeated_removal_is_refused(client, student_with_profile):
    cv = (await upload(client, student_with_profile, pdf_bytes())).json()
    await remove(client, student_with_profile, cv["id"])
    again = await remove(client, student_with_profile, cv["id"])
    assert (again.status_code, again.json()["detail"]["code"]) == (409, "cv_changed")
    assert again.json()["detail"]["cv"] is None


async def test_a_stale_id_keeps_the_current_cv(client, db, student_with_profile):
    current = (await upload(client, student_with_profile, pdf_bytes(), "cur.pdf")).json()
    response = await remove(client, student_with_profile, uuid.uuid4())
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "cv_changed"
    assert response.json()["detail"]["cv"] == current
    assert [str(r.id) for r in await stored(db)] == [current["id"]]


async def test_another_students_cv_cannot_be_removed(
    client, db, student_with_profile, make_user, make_session, make_student_profile
):
    mine = (await upload(client, student_with_profile, pdf_bytes())).json()
    other = await make_user(email="dana@sdu.edu.kz")
    await make_student_profile(other)
    dana = Account(user=other, headers=cookie((await make_session(other))[1]))

    foreign = await remove(client, dana, mine["id"])
    unknown = await remove(client, dana, uuid.uuid4())
    assert (foreign.status_code, foreign.json()) == (unknown.status_code, unknown.json())
    assert foreign.json()["detail"]["cv"] is None
    assert [str(r.id) for r in await stored(db)] == [mine["id"]]


async def test_a_new_upload_works_after_removal(client, db, student_with_profile):
    cv = (await upload(client, student_with_profile, pdf_bytes(), "one.pdf")).json()
    await remove(client, student_with_profile, cv["id"])
    again = await upload(client, student_with_profile, pdf_bytes(), "two.pdf")
    assert (again.status_code, again.json()["file_name"]) == (201, "two.pdf")
    assert len(await stored(db)) == 1


@pytest.mark.parametrize("who", ["guest", "employer", "student"])
async def test_access(client, employer, student, who):
    headers = {"guest": {}, "employer": employer.headers, "student": student.headers}[who]
    expected = {"guest": "not_signed_in", "employer": "wrong_role", "student": "student_profile_required"}[who]
    response = await client.delete(f"{CV_URL}/{uuid.uuid4()}", headers=headers)
    assert response.json()["detail"]["code"] == expected


async def test_a_foreign_origin_is_refused_and_nothing_is_removed(client, db, student_with_profile):
    cv = (await upload(client, student_with_profile, pdf_bytes())).json()
    response = await remove(client, student_with_profile, cv["id"], Origin="https://evil.example")
    assert (response.status_code, response.json()["detail"]["code"]) == (403, "origin_not_allowed")
    assert len(await stored(db)) == 1


async def test_an_id_must_be_a_uuid(client, student_with_profile):
    assert (await client.delete(f"{CV_URL}/7", headers=student_with_profile.headers)).status_code == 422
