import os
import re

import pytest

# Settings are read at import time, so the test environment must be in place before any `src` import.
# The suite only ever touches TEST_DATABASE_URL — never the development DATABASE_URL.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if TEST_DATABASE_URL:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("RESEND_API_KEY", "re_test_key")
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"
os.environ["ENVIRONMENT"] = "development"  # plain-HTTP test client: no Secure cookie flag

import httpx  # noqa: E402
from sqlalchemy import text  # noqa: E402

from src.auth import emailer, sessions  # noqa: E402
from src.auth import models as auth_models  # noqa: F401, E402
from src.auth.utils import hash_password  # noqa: E402
from src.config import settings  # noqa: E402
from src.database import Base, SessionMaker, async_engine  # noqa: E402
from src.main import app  # noqa: E402
from src.users import models as user_models  # noqa: F401, E402
from src.users.models import User, UserRole  # noqa: E402

CODE_RE = re.compile(r"<h2>(\d{6})</h2>")


@pytest.fixture(scope="session", autouse=True)
async def _database():
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL is not set — point it at an empty PostgreSQL database to run the API tests.")
    assert settings.database_url == TEST_DATABASE_URL
    async with async_engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield
    await async_engine.dispose()


@pytest.fixture(autouse=True)
async def _clean_tables(_database):
    yield
    names = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
    async with async_engine.begin() as connection:
        await connection.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))


@pytest.fixture
async def db():
    async with SessionMaker() as session:
        yield session


@pytest.fixture
def make_user(db):
    async def _make(
        email: str = "maya@sdu.edu.kz",
        password: str = "correct-horse",
        role: UserRole = UserRole.student,
    ) -> User:
        user = User(email=email, hashed_password=hash_password(password), role=role)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    return _make


@pytest.fixture
def make_session(db):
    async def _make(user: User):
        """Returns (Session row, raw cookie value)."""
        session, raw = await sessions.create_session(db, user, "pytest")
        await db.commit()
        return session, raw

    return _make


def cookie(raw: str) -> dict[str, str]:
    """Request headers carrying a session cookie (the cookie is scoped to /api, which the helper ignores)."""
    return {"Cookie": f"{sessions.COOKIE_NAME}={raw}"}


@pytest.fixture
def sent_emails(monkeypatch):
    """Captures outgoing emails instead of calling Resend. Each item: {"to", "subject", "code"}."""
    outbox: list[dict] = []

    async def fake_send(to: str, subject: str, html: str) -> None:
        match = CODE_RE.search(html)
        outbox.append({"to": to, "subject": subject, "code": match.group(1) if match else None})

    monkeypatch.setattr(emailer, "_send_email", fake_send)
    return outbox


@pytest.fixture
async def client(sent_emails):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Origin": settings.frontend_origin},
    ) as http:
        yield http
