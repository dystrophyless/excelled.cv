"""File names (research R7) and format detection (research R4). Pure functions; nothing is decompressed."""

import io
import struct
import unicodedata
import zipfile
from urllib.parse import quote, unquote_to_bytes

from src.cv.models import CvFormat

NAME_MAX = 150
DEFAULT_STEM = "CV"
PDF_MARKER_WINDOW = 1024
ZIP_MAX_ENTRIES = 2000
_EOCD = b"PK\x05\x06"
_EOCD_SEARCH = 22 + 0xFFFF  # fixed record plus the longest comment

EXTENSIONS: dict[str, CvFormat] = {".pdf": CvFormat.pdf, ".docx": CvFormat.docx}
MEDIA_TYPES: dict[CvFormat, str] = {
    CvFormat.pdf: "application/pdf",
    CvFormat.docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

_DROPPED = {"Cc", "Cf", "Cs"}  # control, bidi / invisible formatting, surrogates


class InvalidName(ValueError):
    """The `X-File-Name` header is missing or is not percent-encoded UTF-8."""


class UnsupportedName(ValueError):
    """The cleaned name does not end in .pdf or .docx."""


def decode_header(raw: str | None) -> str:
    if not raw:
        raise InvalidName
    if not raw.isascii():
        raise InvalidName
    try:
        return unquote_to_bytes(raw).decode("utf-8")  # strict
    except UnicodeDecodeError:
        raise InvalidName from None


def clean_name(decoded: str) -> tuple[str, CvFormat]:
    """The stored name and the format its extension claims. Raises UnsupportedName."""
    last = decoded.replace("\\", "/").rsplit("/", 1)[-1]
    kept = "".join(ch for ch in unicodedata.normalize("NFC", last) if unicodedata.category(ch) not in _DROPPED)
    name = " ".join(unicodedata.normalize("NFC", kept).split())

    stem, dot, ext = name.rpartition(".")
    extension = f".{ext.lower()}" if dot else ""
    if extension not in EXTENSIONS:
        raise UnsupportedName
    stem = stem[: NAME_MAX - len(extension)].strip() or DEFAULT_STEM
    return f"{stem}.{ext}", EXTENSIONS[extension]


def content_disposition(name: str) -> str:
    """RFC 5987 `filename*` plus an ASCII fallback with no quote, backslash, CR or LF."""
    fallback = "".join(ch if ch.isascii() and (ch.isalnum() or ch in " .-_()") else "_" for ch in name)
    return f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quote(name, safe='')}"


def _entry_count_ok(data: bytes) -> bool:
    """The central directory's entry count, read from the end record before `zipfile` walks the directory."""
    at = data.rfind(_EOCD, max(0, len(data) - _EOCD_SEARCH))
    if at < 0 or len(data) - at < 22:
        return False
    (total,) = struct.unpack_from("<H", data, at + 10)
    return total <= ZIP_MAX_ENTRIES  # 0xFFFF (zip64) is refused too


def _is_docx(data: bytes) -> bool:
    if not _entry_count_ok(data):
        return False
    try:
        # `infolist()` only parses the central directory; no member is opened or decompressed.
        names = [info.filename for info in zipfile.ZipFile(io.BytesIO(data)).infolist()]
    except Exception:  # BadZipFile, NotImplementedError, ValueError, struct.error, OverflowError, ...: all "not a DOCX"
        return False
    if len(names) > ZIP_MAX_ENTRIES:
        return False
    if any("vbaproject.bin" in name.lower() for name in names):
        return False
    return "[Content_Types].xml" in names and "word/document.xml" in names


def detect_format(data: bytes) -> CvFormat | None:
    if b"%PDF-" in data[:PDF_MARKER_WINDOW]:
        return CvFormat.pdf
    if _is_docx(data):
        return CvFormat.docx
    return None
