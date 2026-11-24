import io
import zipfile
from urllib.parse import quote

CV_URL = "/api/student/cv"
MAX_BYTES = 5 * 1024 * 1024

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def pdf_bytes(size: int | None = None) -> bytes:
    data = b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"
    return data if size is None else data + b" " * (size - len(data))


def docx_bytes(*, members: dict[str, bytes] | None = None, omit: tuple[str, ...] = ()) -> bytes:
    files = {
        "[Content_Types].xml": b"<Types/>",
        "word/document.xml": b"<w:document/>",
    } | (members or {})
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as archive:
        for name, content in files.items():
            if name not in omit:
                archive.writestr(name, content)
    return buffer.getvalue()


def name_header(name: str) -> dict[str, str]:
    return {"X-File-Name": quote(name, safe="")}


async def upload(client, account, data: bytes, name: str = "cv.pdf", **headers):
    return await client.post(CV_URL, content=data, headers={**account.headers, **name_header(name), **headers})


async def stored(db, model_column=None):
    """Every stored CV as (id, profile_id, file_name, format, size_bytes, content)."""
    from sqlalchemy import select

    from src.cv.models import StudentCv

    db.expire_all()
    rows = await db.execute(
        select(
            StudentCv.id, StudentCv.profile_id, StudentCv.file_name, StudentCv.format, StudentCv.size_bytes,
            StudentCv.content,
        )
    )  # fmt: skip
    return rows.all()
