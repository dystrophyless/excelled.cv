"""Text from a stored CV (US-17): PDF and DOCX, and what counts as unreadable."""

import io
import zipfile

import pytest

from src.cv import text as cv_text
from src.cv.text import Unreadable, extract_text
from tests.student_skills.helpers import CV_LINES, real_docx, real_pdf


def test_a_docx_gives_its_paragraphs():
    text = extract_text(real_docx(CV_LINES), "docx")
    assert "Skills: Python, SQL, Docker, React" in text
    assert "FastAPI and PostgreSQL" in text


def test_a_docx_gives_the_text_in_its_tables():
    text = extract_text(real_docx(["Aruzhan Test, a student looking for an internship."], ("Skills", "Terraform, Linux")), "docx")
    assert "Terraform, Linux" in text


def test_a_pdf_gives_its_text():
    text = extract_text(real_pdf(CV_LINES), "pdf")
    assert "Skills: Python, SQL, Docker, React" in text


def test_a_pdf_with_text_in_parentheses_is_read():
    text = extract_text(real_pdf(["Languages (spoken): English (C1), Kazakh, Russian - a student CV text."]), "pdf")
    assert "English (C1)" in text


@pytest.mark.parametrize("fmt", ["pdf", "docx"])
def test_a_file_with_almost_no_text_is_unreadable(fmt):
    data = real_pdf(["Hi"]) if fmt == "pdf" else real_docx(["Hi"])
    with pytest.raises(Unreadable):
        extract_text(data, fmt)


@pytest.mark.parametrize("fmt", ["pdf", "docx"])
def test_damaged_or_foreign_bytes_are_unreadable(fmt):
    for data in (b"", b"not a document at all", b"%PDF-1.7 broken", b"PK\x03\x04 broken"):
        with pytest.raises(Unreadable):
            extract_text(data, fmt)


def test_a_docx_that_unpacks_to_a_huge_size_is_refused_without_unpacking_it():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", "<w:document/>")
        archive.writestr("word/media/bomb.bin", b"\x00" * (cv_text.MAX_UNPACKED_BYTES + 1))
    assert len(buffer.getvalue()) < 5 * 1024 * 1024  # it would pass the upload size limit
    with pytest.raises(Unreadable):
        extract_text(buffer.getvalue(), "docx")


def test_the_text_is_cut_at_the_limit(monkeypatch):
    monkeypatch.setattr(cv_text, "MAX_CHARS", 100)
    text = extract_text(real_docx(["Python and SQL. " * 50]), "docx")
    assert len(text) == 100
