"""Plain text from a stored CV (US-17). Pure functions; the CV never leaves the process and the text is not stored.

Untrusted files: pages, characters and the unpacked size of a DOCX are capped, and anything that fails to parse is
"unreadable" rather than an error the student sees as a crash.
"""

import io
import zipfile

MAX_PAGES = 40
MAX_CHARS = 200_000
MAX_UNPACKED_BYTES = 50 * 1024 * 1024  # a 5 MB DOCX may not unpack to more than this (zip bombs)
MIN_CHARS = 40  # less than this is a scan or an empty file, not a CV


class Unreadable(Exception):
    """No usable text: a scan, an empty or damaged file, a locked PDF, or one that is too big to unpack."""


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    if reader.is_encrypted and not reader.decrypt(""):
        raise Unreadable
    parts: list[str] = []
    size = 0
    for page in reader.pages[:MAX_PAGES]:
        text = page.extract_text() or ""
        parts.append(text)
        size += len(text)
        if size >= MAX_CHARS:
            break
    return "\n".join(parts)


def _docx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(info.file_size for info in archive.infolist()) > MAX_UNPACKED_BYTES:
            raise Unreadable

    import docx

    document = docx.Document(io.BytesIO(data))
    parts = [paragraph.text for paragraph in document.paragraphs]
    for table in document.tables:  # many CVs keep the skills in a table
        for row in table.rows:
            seen: set[int] = set()
            for cell in row.cells:
                if id(cell._tc) in seen:  # a merged cell is listed once per column it spans
                    continue
                seen.add(id(cell._tc))
                parts.extend(paragraph.text for paragraph in cell.paragraphs)
    return "\n".join(parts)


def extract_text(data: bytes, fmt: str) -> str:
    """The text of a PDF (`fmt == "pdf"`) or DOCX; raises `Unreadable` when there is not enough of it."""
    try:
        text = _pdf_text(data) if fmt == "pdf" else _docx_text(data)
    except Unreadable:
        raise
    except Exception:  # damaged, locked or odd files raise anything from pypdf, zipfile or lxml: all "unreadable"
        raise Unreadable from None

    text = text.replace("\x00", " ")[:MAX_CHARS]
    if len(text.strip()) < MIN_CHARS:
        raise Unreadable
    return text
