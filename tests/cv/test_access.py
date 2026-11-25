"""Who may use the CV API (spec FR-012, FR-013): the owner only, from the SPA's origin."""

import uuid

import pytest

from tests.cv.helpers import CV_URL, pdf_bytes, upload

FILE_URL = f"{CV_URL}/{uuid.uuid4()}/file"


async def call(client, method: str, path: str, headers: dict):
    if method == "POST":
        return await client.post(path, content=pdf_bytes(), headers={**headers, "X-File-Name": "cv.pdf"})
    return await client.get(path, headers=headers)


ENDPOINTS = [("GET", CV_URL), ("POST", CV_URL), ("GET", FILE_URL)]


@pytest.mark.parametrize(("method", "path"), ENDPOINTS)
async def test_a_guest_is_not_signed_in(client, method, path):
    response = await call(client, method, path, {})
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_signed_in"


@pytest.mark.parametrize(("method", "path"), ENDPOINTS)
async def test_an_employer_is_refused(client, employer, method, path):
    response = await call(client, method, path, employer.headers)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "wrong_role"


@pytest.mark.parametrize(("method", "path"), ENDPOINTS)
async def test_a_student_needs_a_profile(client, student, method, path):
    response = await call(client, method, path, student.headers)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "student_profile_required"


async def test_access_is_checked_before_the_body_is_judged(client, student, employer):
    for account, expected in [(student, "student_profile_required"), (employer, "wrong_role")]:
        response = await client.post(CV_URL, content=b"", headers={**account.headers, "X-File-Name": "%FF"})
        assert response.json()["detail"]["code"] == expected


async def test_a_foreign_origin_is_refused(client, db, student_with_profile):
    response = await client.post(
        CV_URL,
        content=pdf_bytes(),
        headers={**student_with_profile.headers, "X-File-Name": "cv.pdf", "Origin": "https://evil.example"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "origin_not_allowed"
    assert (await client.get(CV_URL, headers=student_with_profile.headers)).json()["cv"] is None


async def test_a_student_with_a_profile_is_let_in(client, student_with_profile):
    assert (await client.get(CV_URL, headers=student_with_profile.headers)).status_code == 200
    assert (await upload(client, student_with_profile, pdf_bytes())).status_code == 201
