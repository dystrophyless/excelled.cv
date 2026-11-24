"""PUT /api/student/cv/{id} (research R5): one conditional UPDATE; the new file is the only CV."""

import asyncio
import uuid

import pytest
from sqlalchemy import delete, event, select

from src.cv.models import StudentCv
from src.database import async_engine
from src.profiles.models import StudentProfile

from tests.conftest import Account, cookie
from tests.cv.helpers import CV_URL, MAX_BYTES, docx_bytes, name_header, pdf_bytes, stored, upload


def code(response) -> str:
    return response.json()["detail"]["code"]


async def replace(client, account, cv_id, data, name: str = "new.pdf", **headers):
    return await client.put(
        f"{CV_URL}/{cv_id}", content=data, headers={**account.headers, **name_header(name), **headers}
    )


async def test_a_replacement_becomes_the_only_cv(client, db, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes(), "old.pdf")).json()
    data = docx_bytes()

    response = await replace(client, student_with_profile, old["id"], data, "new.docx")
    assert response.status_code == 200
    new = response.json()
    assert new["id"] != old["id"]
    assert (new["file_name"], new["format"], new["size_bytes"]) == ("new.docx", "docx", len(data))
    assert new["uploaded_at"] >= old["uploaded_at"]

    (row,) = await stored(db)  # the old bytes are gone
    assert (str(row.id), row.content, row.format.value) == (new["id"], data, "docx")
    assert (await client.get(CV_URL, headers=student_with_profile.headers)).json()["cv"] == new


async def test_the_old_id_stops_working(client, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes(), "old.pdf")).json()
    new = (await replace(client, student_with_profile, old["id"], pdf_bytes(), "new.pdf")).json()

    again = await replace(client, student_with_profile, old["id"], pdf_bytes(), "third.pdf")
    assert (again.status_code, code(again)) == (409, "cv_changed")
    assert again.json()["detail"]["cv"] == new
    assert (await client.get(f"{CV_URL}/{old['id']}/file", headers=student_with_profile.headers)).status_code == 409


async def test_exactly_five_megabytes_replace(client, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes(), "old.pdf")).json()
    response = await replace(client, student_with_profile, old["id"], pdf_bytes(MAX_BYTES))
    assert response.status_code == 200 and response.json()["size_bytes"] == MAX_BYTES


@pytest.mark.parametrize(
    ("data", "name", "expected", "status"),
    [
        (pdf_bytes(MAX_BYTES + 1), "new.pdf", "cv_too_large", 413),
        (b"", "new.pdf", "cv_empty", 422),
        (b"junk", "new.pdf", "cv_format_unsupported", 422),
        (docx_bytes(), "new.pdf", "cv_format_unsupported", 422),
        (docx_bytes(members={"word/vbaProject.bin": b"x"}), "new.docx", "cv_format_unsupported", 422),
        (pdf_bytes(), "new.txt", "cv_format_unsupported", 422),
    ],
)
async def test_a_refused_replacement_keeps_the_old_bytes(client, db, student_with_profile, data, name, expected, status):
    old_data = pdf_bytes(2000)
    old = (await upload(client, student_with_profile, old_data, "old.pdf")).json()
    before = await stored(db)

    response = await replace(client, student_with_profile, old["id"], data, name)
    assert (response.status_code, code(response)) == (status, expected)
    assert await stored(db) == before
    assert before[0].content == old_data


async def test_a_bad_name_header_is_refused(client, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes())).json()
    response = await replace(client, student_with_profile, old["id"], pdf_bytes(), **{"X-File-Name": "%FF"})
    assert (response.status_code, code(response)) == (422, "cv_name_invalid")


async def test_a_stale_id_after_a_valid_body_gives_the_current_cv(client, db, student_with_profile):
    current = (await upload(client, student_with_profile, pdf_bytes(), "cur.pdf")).json()
    response = await replace(client, student_with_profile, uuid.uuid4(), pdf_bytes(), "x.pdf")
    assert (response.status_code, code(response)) == (409, "cv_changed")
    assert response.json()["detail"]["cv"] == current
    assert [str(r.id) for r in await stored(db)] == [current["id"]]


async def test_the_current_state_is_checked_last(client, student_with_profile):
    response = await replace(client, student_with_profile, uuid.uuid4(), b"junk", "x.pdf")
    assert code(response) == "cv_format_unsupported"


async def test_replacing_when_there_is_no_cv(client, student_with_profile):
    response = await replace(client, student_with_profile, uuid.uuid4(), pdf_bytes())
    assert (response.status_code, code(response)) == (409, "cv_changed")
    assert response.json()["detail"]["cv"] is None


async def test_a_cv_removed_meanwhile_is_not_resurrected(client, db, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes())).json()

    async def body():
        yield b"%PDF-1.7 "
        await db.execute(delete(StudentCv))
        await db.commit()
        yield b"rest"

    response = await replace(client, student_with_profile, old["id"], body())
    assert (response.status_code, code(response)) == (409, "cv_changed")
    assert response.json()["detail"]["cv"] is None
    assert await stored(db) == []


async def test_a_profile_deleted_meanwhile_is_refused(client, db, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes())).json()

    async def body():
        yield b"%PDF-1.7 "
        await db.execute(delete(StudentProfile))
        await db.commit()
        yield b"rest"

    response = await replace(client, student_with_profile, old["id"], body())
    assert (response.status_code, code(response)) == (403, "student_profile_required")


async def test_another_students_id_is_refused_like_an_unknown_one(
    client, db, student_with_profile, make_user, make_session, make_student_profile
):
    mine = (await upload(client, student_with_profile, pdf_bytes(), "aru.pdf")).json()
    other = await make_user(email="dana@sdu.edu.kz")
    await make_student_profile(other)
    dana = Account(user=other, headers=cookie((await make_session(other))[1]))

    foreign = await replace(client, dana, mine["id"], pdf_bytes(), "dana.pdf")
    unknown = await replace(client, dana, uuid.uuid4(), pdf_bytes(), "dana.pdf")
    assert (foreign.status_code, foreign.json()) == (unknown.status_code, unknown.json())
    assert foreign.json()["detail"]["cv"] is None
    assert [str(r.id) for r in await stored(db)] == [mine["id"]]  # aru's file is untouched


async def test_concurrent_replacements_have_one_winner(client, db, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes(), "old.pdf")).json()
    responses = await asyncio.gather(
        *(replace(client, student_with_profile, old["id"], pdf_bytes(1000 + i), f"r{i}.pdf") for i in range(6))
    )
    assert sorted(r.status_code for r in responses) == [200, 409, 409, 409, 409, 409]
    winner = next(r for r in responses if r.status_code == 200).json()
    for loser in (r for r in responses if r.status_code == 409):
        assert code(loser) == "cv_changed"
    (row,) = await stored(db)
    assert str(row.id) == winner["id"] and row.size_bytes == winner["size_bytes"]


async def test_the_connection_is_released_while_the_body_arrives(client, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes())).json()
    checked_out = []

    async def body():
        yield b"%PDF-1.7 "
        checked_out.append(async_engine.pool.checkedout())
        yield b"rest"

    assert (await replace(client, student_with_profile, old["id"], body())).status_code == 200
    assert checked_out == [0]


async def test_content_is_never_read_by_a_replacement(client, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes())).json()
    statements: list[str] = []

    def record(conn, cursor, statement, *_):
        statements.append(statement)

    event.listen(async_engine.sync_engine, "before_cursor_execute", record)
    try:
        assert (await replace(client, student_with_profile, old["id"], pdf_bytes())).status_code == 200
        await replace(client, student_with_profile, old["id"], pdf_bytes())  # stale
    finally:
        event.remove(async_engine.sync_engine, "before_cursor_execute", record)

    assert not [s for s in statements if s.startswith("SELECT") and "student_cvs.content" in s]
    assert not [s for s in statements if "RETURNING" in s and "student_cvs" in s]


async def test_the_profile_is_not_touched(client, db, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes())).json()
    before = (await db.scalars(select(StudentProfile))).one()
    version, updated = before.version, before.updated_at
    await replace(client, student_with_profile, old["id"], pdf_bytes())
    db.expire_all()
    after = (await db.scalars(select(StudentProfile))).one()
    assert (after.version, after.updated_at) == (version, updated)


@pytest.mark.parametrize("who", ["guest", "employer", "student"])
async def test_access(client, employer, student, who):
    headers = {"guest": {}, "employer": employer.headers, "student": student.headers}[who]
    expected = {"guest": "not_signed_in", "employer": "wrong_role", "student": "student_profile_required"}[who]
    response = await client.put(
        f"{CV_URL}/{uuid.uuid4()}", content=pdf_bytes(), headers={**headers, "X-File-Name": "cv.pdf"}
    )
    assert code(response) == expected


async def test_a_foreign_origin_is_refused(client, student_with_profile):
    old = (await upload(client, student_with_profile, pdf_bytes(), "old.pdf")).json()
    response = await replace(client, student_with_profile, old["id"], pdf_bytes(), Origin="https://evil.example")
    assert (response.status_code, code(response)) == (403, "origin_not_allowed")


async def test_an_id_must_be_a_uuid(client, student_with_profile):
    response = await client.put(f"{CV_URL}/7", content=pdf_bytes(), headers=student_with_profile.headers)
    assert response.status_code == 422
