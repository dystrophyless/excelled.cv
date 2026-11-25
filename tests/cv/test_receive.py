"""Receiving and checking the body: the claimed format decides what the content must be."""

import pytest

from tests.cv.helpers import docx_bytes, upload


async def test_a_docx_whose_first_kilobyte_mentions_pdf_is_accepted(client, student_with_profile):
    data = docx_bytes(members={"word/document.xml": b"%PDF-1.7 pasted text"})
    assert b"%PDF-" in data[:1024]
    response = await upload(client, student_with_profile, data, "cv.docx")
    assert (response.status_code, response.json()["format"]) == (201, "docx")


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (b"abc", None),
        (b"-5", None),
        (b"1e3", None),
        (b"", None),
        (b"1.5", None),
        ("٣".encode(), None),  # a non-ASCII digit
        (b" 12 ", 12),
        (b"0", 0),
    ],
)
def test_declared_length_ignores_invalid_values(value, expected):
    from starlette.requests import Request

    from src.cv.receive import _declared_length

    scope = {"type": "http", "method": "POST", "path": "/", "headers": [(b"content-length", value)]}
    assert _declared_length(Request(scope)) == expected


def test_a_missing_content_length_is_none():
    from starlette.requests import Request

    from src.cv.receive import _declared_length

    assert _declared_length(Request({"type": "http", "method": "POST", "path": "/", "headers": []})) is None
