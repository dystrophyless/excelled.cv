"""POST /api/student/cv (contracts/cv-api.md): what is stored, what is refused, and in which order."""

import asyncio

import pytest
from sqlalchemy import delete, event, func, select

from src.cv.models import StudentCv
from src.database import async_engine
from src.profiles.models import StudentProfile

from tests.cv.helpers import CV_URL, MAX_BYTES, docx_bytes, pdf_bytes, stored, upload


def code(response) -> str:
    return response.json()["detail"]["code"]


def chunked(data: bytes, size: int = 65536):
    async def body():
        for start in range(0, len(data), size):
            yield data[start : start + size]

    return body()


async def test_a_pdf_is_stored(client, db, student_with_profile):
    data = pdf_bytes()
    response = await upload(client, student_with_profile, data, "My CV.pdf")

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "file_name", "format", "size_bytes", "uploaded_at"}
    assert (body["file_name"], body["format"], body["size_bytes"]) == ("My CV.pdf", "pdf", len(data))

    (row,) = await stored(db)
    assert str(row.id) == body["id"] and row.content == data


async def test_a_docx_is_stored(client, db, student_with_profile):
    data = docx_bytes()
    response = await upload(client, student_with_profile, data, "cv.DOCX")
    assert response.status_code == 201
    assert response.json()["format"] == "docx"
    assert (await stored(db))[0].content == data


async def test_the_list_shows_the_stored_cv_without_caching(client, student_with_profile):
    empty = await client.get(CV_URL, headers=student_with_profile.headers)
    assert empty.status_code == 200
    assert empty.json() == {"cv": None, "limits": {"formats": ["pdf", "docx"], "max_bytes": MAX_BYTES}}
    assert empty.headers["cache-control"] == "no-store"

    created = (await upload(client, student_with_profile, pdf_bytes())).json()
    shown = await client.get(CV_URL, headers=student_with_profile.headers)
    assert shown.json()["cv"] == created
    assert shown.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("streamed", [False, True], ids=["content-length", "chunked"])
async def test_exactly_five_megabytes_are_accepted(client, student_with_profile, streamed):
    data = pdf_bytes(MAX_BYTES)
    response = await upload(client, student_with_profile, chunked(data) if streamed else data)
    assert response.status_code == 201
    assert response.json()["size_bytes"] == MAX_BYTES


@pytest.mark.parametrize("streamed", [False, True], ids=["content-length", "chunked"])
async def test_one_byte_more_is_refused(client, db, student_with_profile, streamed):
    data = pdf_bytes(MAX_BYTES + 1)
    response = await upload(client, student_with_profile, chunked(data) if streamed else data)
    assert response.status_code == 413
    assert code(response) == "cv_too_large"
    assert response.json()["detail"]["max_bytes"] == MAX_BYTES
    assert await stored(db) == []


async def test_a_wrong_content_length_does_not_fool_the_limit(client, student_with_profile):
    response = await upload(client, student_with_profile, pdf_bytes(MAX_BYTES + 1), **{"Content-Length": "10"})
    assert response.status_code == 413


@pytest.mark.parametrize("value", ["abc", "-5", "1e3", ""])
async def test_an_invalid_content_length_is_ignored(client, student_with_profile, value):
    response = await upload(client, student_with_profile, chunked(pdf_bytes()), **{"Content-Length": value})
    assert response.status_code == 201


async def test_the_limit_stops_reading_the_body(client, student_with_profile):
    sent = 0

    async def body():
        nonlocal sent
        chunk = b"%PDF-" + b"x" * 1_000_000
        for _ in range(50):
            sent += len(chunk)
            yield chunk

    response = await upload(client, student_with_profile, body())
    assert response.status_code == 413
    assert sent < 10 * 1_000_000


async def test_an_empty_file_is_refused(client, student_with_profile):
    response = await upload(client, student_with_profile, b"")
    assert (response.status_code, code(response)) == (422, "cv_empty")


@pytest.mark.parametrize(
    ("data", "name"),
    [
        (b"just text", "cv.pdf"),
        (docx_bytes(), "cv.pdf"),  # a DOCX renamed
        (pdf_bytes(), "cv.docx"),  # a PDF renamed
        (b"PK\x03\x04 not really", "cv.docx"),
        (docx_bytes()[:-30], "cv.docx"),  # damaged container
        (docx_bytes(omit=("word/document.xml",)), "cv.docx"),
        (docx_bytes(members={"word/vbaProject.bin": b"x"}), "cv.docx"),  # macros
        (b" " * 2000 + pdf_bytes(), "cv.pdf"),  # marker too far in
        (pdf_bytes(), "cv.txt"),
        (pdf_bytes(), "cv"),
        (pdf_bytes(), "cv.pdf.exe"),
    ],
)
async def test_a_file_that_is_not_what_it_claims_is_refused(client, db, student_with_profile, data, name):
    response = await upload(client, student_with_profile, data, name)
    assert (response.status_code, code(response)) == (422, "cv_format_unsupported")
    assert await stored(db) == []


@pytest.mark.parametrize("header", [None, "", "%FF%FE.pdf", "%C3.pdf"])
async def test_the_name_header_must_be_present_and_valid(client, student_with_profile, header):
    headers = dict(student_with_profile.headers)
    if header is not None:
        headers["X-File-Name"] = header
    response = await client.post(CV_URL, content=pdf_bytes(), headers=headers)
    assert (response.status_code, code(response)) == (422, "cv_name_invalid")


@pytest.mark.parametrize(
    ("sent", "stored_as"),
    [
        ("Резюме Айдара.pdf", "Резюме Айдара.pdf"),
        ("../../secret/cv.pdf", "cv.pdf"),
        ("C:\\Users\\aidar\\cv.pdf", "cv.pdf"),
        ("cv\x00\x07.pdf", "cv.pdf"),
        ("cv\u202etxt.pdf", "cvtxt.pdf"),
        ("my   \n cv.pdf", "my cv.pdf"),
        (".pdf", "CV.pdf"),
        ("e\u0301.pdf", "\u00e9.pdf"),
    ],
)
async def test_names_are_cleaned_before_they_are_stored(client, student_with_profile, sent, stored_as):
    response = await upload(client, student_with_profile, pdf_bytes(), sent)
    assert response.status_code == 201
    assert response.json()["file_name"] == stored_as


async def test_a_long_name_keeps_its_extension(client, student_with_profile):
    response = await upload(client, student_with_profile, docx_bytes(), "ж" * 300 + ".docx")
    assert response.status_code == 201
    name = response.json()["file_name"]
    assert len(name) == 150 and name.endswith(".docx")


async def test_the_name_is_checked_before_the_size(client, student_with_profile):
    response = await upload(client, student_with_profile, pdf_bytes(MAX_BYTES + 1), "cv.exe")
    assert code(response) == "cv_format_unsupported"
    response = await upload(client, student_with_profile, pdf_bytes(MAX_BYTES + 1), "cv.pdf", **{"X-File-Name": "%FF"})
    assert code(response) == "cv_name_invalid"


async def test_the_size_is_checked_before_the_content(client, student_with_profile):
    response = await upload(client, student_with_profile, b"x" * (MAX_BYTES + 1), "cv.pdf")
    assert code(response) == "cv_too_large"


async def test_the_content_is_checked_before_the_current_state(client, student_with_profile):
    await upload(client, student_with_profile, pdf_bytes())
    response = await upload(client, student_with_profile, b"not a pdf", "other.pdf")
    assert (response.status_code, code(response)) == (422, "cv_format_unsupported")


async def test_a_second_upload_is_refused_with_the_current_cv(client, db, student_with_profile):
    first = (await upload(client, student_with_profile, pdf_bytes(), "first.pdf")).json()

    response = await upload(client, student_with_profile, pdf_bytes(), "second.pdf")
    assert (response.status_code, code(response)) == (409, "cv_exists")
    assert response.json()["detail"]["cv"] == first  # JSON-safe: id and date are strings

    (row,) = await stored(db)
    assert row.file_name == "first.pdf"


async def test_concurrent_uploads_store_one_cv(client, db, student_with_profile):
    responses = await asyncio.gather(
        *(upload(client, student_with_profile, pdf_bytes(), f"cv{i}.pdf") for i in range(6))
    )
    assert sorted(r.status_code for r in responses) == [201, 409, 409, 409, 409, 409]
    losers = [r for r in responses if r.status_code == 409]
    assert {code(r) for r in losers} == {"cv_exists"}
    assert all(r.json()["detail"]["cv"] is not None for r in losers)
    assert len(await stored(db)) == 1


async def test_the_connection_is_released_while_the_body_arrives(client, student_with_profile):
    checked_out = []

    async def body():
        yield b"%PDF-1.7 "
        checked_out.append(async_engine.pool.checkedout())
        await asyncio.sleep(0.05)
        yield b"rest"
        checked_out.append(async_engine.pool.checkedout())

    response = await upload(client, student_with_profile, body())
    assert response.status_code == 201
    assert checked_out == [0, 0]


async def test_a_slow_body_times_out(client, db, student_with_profile, monkeypatch):
    monkeypatch.setattr("src.cv.receive.RECEIVE_TIMEOUT", 0.2)

    async def body():
        yield b"%PDF-1.7 "
        await asyncio.sleep(2)
        yield b"too late"

    response = await upload(client, student_with_profile, body())
    assert (response.status_code, code(response)) == (408, "cv_upload_timeout")
    assert await stored(db) == []


async def test_a_client_that_leaves_stores_nothing_and_does_not_crash(db, student_with_profile):
    from src.main import app

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": CV_URL,
        "raw_path": CV_URL.encode(),
        "query_string": b"",
        "root_path": "",
        "client": ("127.0.0.1", 1234),
        "server": ("test", 80),
        "headers": [
            (b"host", b"test"),
            (b"origin", b"http://localhost:5173"),
            (b"cookie", student_with_profile.headers["Cookie"].encode()),
            (b"x-file-name", b"cv.pdf"),
            (b"transfer-encoding", b"chunked"),
        ],
    }
    messages = iter(
        [
            {"type": "http.request", "body": b"%PDF-1.7 half", "more_body": True},
            {"type": "http.disconnect"},
        ]
    )
    sent = []

    async def receive():
        return next(messages, {"type": "http.disconnect"})

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)  # must not raise
    assert all(m.get("status", 200) < 500 for m in sent if m["type"] == "http.response.start")
    assert await stored(db) == []


async def test_a_profile_deleted_while_the_body_arrives_is_refused(client, db, student_with_profile):
    async def body():
        yield b"%PDF-1.7 "
        await db.execute(delete(StudentProfile))
        await db.commit()
        yield b"rest"

    response = await upload(client, student_with_profile, body())
    assert (response.status_code, code(response)) == (403, "student_profile_required")
    assert await stored(db) == []


async def test_a_rejected_upload_changes_nothing(client, db, student_with_profile):
    await upload(client, student_with_profile, pdf_bytes(), "keep.pdf")
    before = await stored(db)
    for data, name in [(b"", "x.pdf"), (b"junk", "x.pdf"), (pdf_bytes(MAX_BYTES + 1), "x.pdf"), (pdf_bytes(), "x.txt")]:
        await upload(client, student_with_profile, data, name)
    assert await stored(db) == before


async def test_content_is_never_selected_apart_from_the_download(client, student_with_profile):
    statements: list[str] = []

    def record(conn, cursor, statement, *_):
        statements.append(statement)

    event.listen(async_engine.sync_engine, "before_cursor_execute", record)
    try:
        created = (await upload(client, student_with_profile, pdf_bytes())).json()
        await client.get(CV_URL, headers=student_with_profile.headers)
        await upload(client, student_with_profile, pdf_bytes(), "again.pdf")  # refused with the current cv
        await client.get(f"{CV_URL}/{created['id']}/file", headers=student_with_profile.headers)
    finally:
        event.remove(async_engine.sync_engine, "before_cursor_execute", record)

    reading = [s for s in statements if "student_cvs.content" in s]
    assert len(reading) == 1 and reading[0].startswith("SELECT")  # the download alone
    inserts = [s for s in statements if s.startswith("INSERT INTO student_cvs")]
    assert len(inserts) == 1 and "RETURNING" not in inserts[0]


async def test_the_profile_is_not_touched(client, db, student_with_profile):
    before = (await db.scalars(select(StudentProfile))).one()
    version, updated = before.version, before.updated_at
    await upload(client, student_with_profile, pdf_bytes())
    db.expire_all()
    after = (await db.scalars(select(StudentProfile))).one()
    assert (after.version, after.updated_at) == (version, updated)


async def test_deleting_the_profile_removes_the_cv(client, db, student_with_profile):
    await upload(client, student_with_profile, pdf_bytes())
    assert await db.scalar(select(func.count()).select_from(StudentCv)) == 1
    await db.execute(delete(StudentProfile))
    await db.commit()
    assert await db.scalar(select(func.count()).select_from(StudentCv)) == 0
