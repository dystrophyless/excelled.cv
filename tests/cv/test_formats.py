"""Name cleaning (research R7) and format detection (research R4), without a database."""

import pytest

from src.cv import formats
from src.cv.models import CvFormat

from tests.cv.helpers import docx_bytes, pdf_bytes


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("CV.pdf", ("CV.pdf", CvFormat.pdf)),
        ("Резюме Иван.DOCX", ("Резюме Иван.DOCX", CvFormat.docx)),
        (r"C:\Users\me\cv.pdf",("cv.pdf", CvFormat.pdf)),
        ("../../etc/passwd/cv.pdf", ("cv.pdf", CvFormat.pdf)),
        ("a\x00b\x1f.pdf", ("ab.pdf", CvFormat.pdf)),
        ("cv\u202epdf.pdf", ("cvpdf.pdf", CvFormat.pdf)),  # right-to-left override
        ("cv\u200b.pdf", ("cv.pdf", CvFormat.pdf)),  # zero-width space (Cf)
        ("  my \t\n  cv\u2028final .pdf", ("my cv final.pdf", CvFormat.pdf)),
        ("e\u0301.pdf", ("\u00e9.pdf", CvFormat.pdf)),  # NFC
        (".pdf", ("CV.pdf", CvFormat.pdf)),
        (" \u202e .docx", ("CV.docx", CvFormat.docx)),
        ("a.b.c.pdf", ("a.b.c.pdf", CvFormat.pdf)),
    ],
)
def test_names_are_cleaned(raw, expected):
    assert formats.clean_name(raw) == expected


def test_a_long_name_is_cut_but_keeps_its_extension():
    name, fmt = formats.clean_name("я" * 400 + ".docx")
    assert len(name) == formats.NAME_MAX
    assert name.endswith("я.docx") and fmt is CvFormat.docx


def test_a_name_at_the_limit_is_kept():
    stem = "a" * (formats.NAME_MAX - 4)
    assert formats.clean_name(stem + ".pdf")[0] == stem + ".pdf"


@pytest.mark.parametrize("raw", ["cv", "cv.txt", "cv.pdf.exe", "cv.pdf/", "cv.", "cv.pdf\u202e.exe", "a\\", "cv. pdf"])
def test_other_extensions_are_unsupported(raw):
    with pytest.raises(formats.UnsupportedName):
        formats.clean_name(raw)


def test_the_header_is_strict_percent_encoded_utf8():
    assert formats.decode_header("%D0%A0%D0%B5%D0%B7.pdf") == "Рез.pdf"
    for bad in (None, "", "%FF.pdf", "%C3.pdf", "Рез.pdf"):
        with pytest.raises(formats.InvalidName):
            formats.decode_header(bad)


def test_the_download_header_has_a_safe_ascii_fallback():
    header = formats.content_disposition('Резюме "x"\r\n;\\.pdf')
    ascii_part, _, star = header.partition("; filename*=")
    assert header.isascii() and "\r" not in header and "\n" not in header
    assert ascii_part.count('"') == 2  # only the delimiters
    assert star.startswith("UTF-8''%D0%A0")
    assert ascii_part.endswith('.pdf"')


def test_pdf_marker_must_be_in_the_first_kilobyte():
    assert formats.detect_format(pdf_bytes()) is CvFormat.pdf
    assert formats.detect_format(b"junk" * 100 + pdf_bytes()) is CvFormat.pdf
    assert formats.detect_format(b" " * 1100 + pdf_bytes()) is None
    assert formats.detect_format(b"hello") is None


def test_docx_needs_its_two_parts():
    assert formats.detect_format(docx_bytes()) is CvFormat.docx
    assert formats.detect_format(docx_bytes(omit=("word/document.xml",))) is None
    assert formats.detect_format(docx_bytes(omit=("[Content_Types].xml",))) is None


@pytest.mark.parametrize("macro", ["word/vbaProject.bin", "WORD/VBAPROJECT.BIN", "x/y/vbaproject.bin"])
def test_a_macro_document_is_not_accepted(macro):
    assert formats.detect_format(docx_bytes(members={macro: b"x"})) is None


def test_zip_problems_mean_unsupported():
    good = docx_bytes()
    broken = [
        good[:-10],  # end record cut
        good[: len(good) // 2],
        b"PK\x05\x06" + b"\x00" * 18,  # an empty archive
        b"PK\x03\x04" + b"\x00" * 100,
        bytes(len(good)),
        good.replace(b"PK\x01\x02", b"XX\x01\x02"),  # damaged directory entry
    ]
    for data in broken:
        assert formats.detect_format(data) is None


def test_a_directory_with_too_many_entries_is_refused():
    many = docx_bytes(members={f"f{i}.txt": b"" for i in range(formats.ZIP_MAX_ENTRIES)})
    assert formats.detect_format(many) is None
    assert formats.detect_format(docx_bytes(members={f"f{i}.txt": b"" for i in range(100)})) is CvFormat.docx


def test_a_forged_entry_count_is_refused_before_the_directory_is_read():
    data = bytearray(docx_bytes())
    at = data.rfind(b"PK\x05\x06")
    data[at + 10 : at + 12] = b"\xff\xff"
    assert formats.detect_format(bytes(data)) is None
