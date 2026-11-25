"""GET /api/student/cv/{id}/file: the same bytes, safe headers, owner only."""

import re
import uuid

import pytest

from tests.cv.helpers import CV_URL, DOCX_MIME, docx_bytes, pdf_bytes, upload


async def test_the_download_is_byte_identical_with_safe_headers(client, student_with_profile):
    data = pdf_bytes(300_000)
    created = (await upload(client, student_with_profile, data, "Резюме.pdf")).json()

    response = await client.get(f"{CV_URL}/{created['id']}/file", headers=student_with_profile.headers)
    assert response.status_code == 200
    assert response.content == data
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-length"] == str(len(data))
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["content-security-policy"] == "sandbox; default-src 'none'"
    assert response.headers["cache-control"] == "private, no-store"

    disposition = response.headers["content-disposition"]
    assert disposition.startswith("attachment;")
    assert "filename*=UTF-8''%D0%A0%D0%B5%D0%B7%D1%8E%D0%BC%D0%B5.pdf" in disposition
    assert re.search(r'filename="[A-Za-z0-9 ._()-]+\.pdf"', disposition)


async def test_a_docx_has_its_own_media_type(client, student_with_profile):
    data = docx_bytes()
    created = (await upload(client, student_with_profile, data, "cv.docx")).json()
    response = await client.get(f"{CV_URL}/{created['id']}/file", headers=student_with_profile.headers)
    assert response.content == data
    assert response.headers["content-type"] == DOCX_MIME


async def test_the_media_type_comes_from_the_detected_format_not_the_browser(client, student_with_profile):
    created = (
        await upload(client, student_with_profile, pdf_bytes(), "cv.pdf", **{"Content-Type": "text/html"})
    ).json()
    response = await client.get(f"{CV_URL}/{created['id']}/file", headers=student_with_profile.headers)
    assert response.headers["content-type"] == "application/pdf"


async def test_a_name_with_quotes_and_line_breaks_cannot_break_the_header(client, student_with_profile):
    created = (await upload(client, student_with_profile, pdf_bytes(), 'a"b\r\nSet-Cookie: x=1;\\.pdf')).json()
    response = await client.get(f"{CV_URL}/{created['id']}/file", headers=student_with_profile.headers)
    assert response.status_code == 200
    assert "set-cookie" not in response.headers
    assert "\n" not in response.headers["content-disposition"]


async def test_an_unknown_id_gives_the_current_cv(client, student_with_profile):
    nothing = await client.get(f"{CV_URL}/{uuid.uuid4()}/file", headers=student_with_profile.headers)
    assert nothing.status_code == 409
    assert nothing.json()["detail"]["code"] == "cv_changed"
    assert nothing.json()["detail"]["cv"] is None

    created = (await upload(client, student_with_profile, pdf_bytes())).json()
    stale = await client.get(f"{CV_URL}/{uuid.uuid4()}/file", headers=student_with_profile.headers)
    assert stale.json()["detail"]["code"] == "cv_changed"
    assert stale.json()["detail"]["cv"] == created


async def test_another_students_id_looks_like_an_unknown_one(client, student_with_profile, make_user, make_session, make_student_profile):
    from tests.conftest import cookie

    created = (await upload(client, student_with_profile, pdf_bytes(), "aru.pdf")).json()

    other = await make_user(email="dana@sdu.edu.kz")
    await make_student_profile(other)
    other_headers = cookie((await make_session(other))[1])

    without_cv = await client.get(f"{CV_URL}/{created['id']}/file", headers=other_headers)
    unknown = await client.get(f"{CV_URL}/{uuid.uuid4()}/file", headers=other_headers)
    assert (without_cv.status_code, without_cv.json()) == (unknown.status_code, unknown.json())
    assert without_cv.json()["detail"]["cv"] is None

    mine = (
        await client.post(
            CV_URL, content=docx_bytes(), headers={**other_headers, "X-File-Name": "dana.docx"}
        )
    ).json()
    foreign = await client.get(f"{CV_URL}/{created['id']}/file", headers=other_headers)
    assert foreign.status_code == 409
    assert foreign.json()["detail"]["code"] == "cv_changed"
    assert foreign.json()["detail"]["cv"] == mine  # only the caller's own cv
    assert foreign.content != pdf_bytes()


@pytest.mark.parametrize("bad", ["1", "not-a-uuid"])
async def test_an_id_must_be_a_uuid(client, student_with_profile, bad):
    response = await client.get(f"{CV_URL}/{bad}/file", headers=student_with_profile.headers)
    assert response.status_code == 422
