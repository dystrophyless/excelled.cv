import os
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

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
from src.cv import models as cv_models  # noqa: F401, E402
from src.profiles import models as profile_models  # noqa: F401, E402
from src.skills import models as skill_models  # noqa: F401, E402
from src.student_skills import models as student_skill_models  # noqa: F401, E402
from src.users import models as user_models  # noqa: F401, E402
from src.vacancies import models as vacancy_models  # noqa: F401, E402
from src.users.models import User, UserRole  # noqa: E402
from src.catalog.enums import City, CompanySize, Degree, Industry, VacancyField, VacancyType, WorkFormat  # noqa: E402
from src.profiles.models import CompanyProfile, StudentProfile  # noqa: E402
from src.vacancies import repository, rules  # noqa: E402
from src.vacancies.deadlines import closes_at_for  # noqa: E402
from src.vacancies.models import ClosedBy, Vacancy, VacancyStatus  # noqa: E402

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


@dataclass
class Account:
    """A signed-in test account: the user row and request headers carrying its session cookie."""

    user: User
    headers: dict[str, str]


async def _signed_in(make_user, make_session, email: str, role: UserRole) -> Account:
    user = await make_user(email=email, role=role)
    _, raw = await make_session(user)
    return Account(user=user, headers=cookie(raw))


@pytest.fixture
def make_company_profile(db):
    """A company profile for an employer (003): vacancy actions need one (FR-015)."""

    async def _make(user: User, **overrides):
        profile = CompanyProfile(
            user_id=user.id,
            **({"name": "Acme", "industry": Industry.it, "size": CompanySize.s11_50} | overrides),
        )
        db.add(profile)
        await db.commit()
        return profile

    return _make


@pytest.fixture
def make_student_profile(db):
    """A complete student profile (003): Bachelor's, 3rd year, looking for a backend internship."""

    async def _make(user: User, **overrides):
        values = {
            "full_name": "Maya Akhmetova",
            "university": "Suleyman Demirel University",
            "degree": Degree.bachelor,
            "major": "Computer Science",
            "study_year": 3,
            "graduated": False,
            "looking_for_fields": [VacancyField.backend],
            "position_types": [VacancyType.internship],
        } | overrides
        profile = StudentProfile(user_id=user.id, **values)
        db.add(profile)
        await db.commit()
        return profile

    return _make


@pytest.fixture
def make_vacancy(db):
    """Inserts a vacancy straight into the database. `owner` is an Account fixture or a User."""

    async def _make(
        owner,
        *,
        title: str = "Backend Intern (Python)",
        status: VacancyStatus = VacancyStatus.draft,
        complete: bool = True,
        apply_by: date | None = None,
        required: list[str] | None = None,
        nice: list[str] | None = None,
        **overrides,
    ) -> Vacancy:
        user = getattr(owner, "user", owner)
        values: dict = {"employer_id": user.id, "title": title, "status": status}
        if complete:
            if apply_by is None:
                apply_by = (datetime.now(UTC) + timedelta(days=14)).date()
            values |= {
                "type": VacancyType.internship,
                "field": VacancyField.backend,
                "city": City.almaty,
                "format": WorkFormat.hybrid,
                "description": "Join the Payments team.",
                "apply_by": apply_by,
                "closes_at": closes_at_for(apply_by),
            }
        elif apply_by is not None:
            values |= {"apply_by": apply_by, "closes_at": closes_at_for(apply_by)}
        if status != VacancyStatus.draft:
            values["published_at"] = datetime.now(UTC) - timedelta(days=1)
        if status == VacancyStatus.closed:
            values |= {"closed_at": datetime.now(UTC), "closed_by": ClosedBy.employer}
        values |= overrides

        vacancy = Vacancy(**values)
        db.add(vacancy)
        await db.flush()
        required_names, nice_names = rules.resolve_skills(
            ["Python", "SQL"] if required is None and complete else (required or []),
            nice or [],
        )
        await repository.set_skills(db, vacancy.id, required_names, nice_names)
        await db.commit()
        await db.refresh(vacancy)
        return vacancy

    return _make


@pytest.fixture
async def employer(make_user, make_session, make_company_profile) -> Account:
    account = await _signed_in(make_user, make_session, "hr@kaspi.kz", UserRole.employer)
    await make_company_profile(account.user, name="Acme")
    return account


@pytest.fixture
async def other_employer(make_user, make_session, make_company_profile) -> Account:
    account = await _signed_in(make_user, make_session, "hr@halyk.kz", UserRole.employer)
    await make_company_profile(account.user, name="Other Co")
    return account


@pytest.fixture
async def employer_without_profile(make_user, make_session) -> Account:
    return await _signed_in(make_user, make_session, "new-hr@company.kz", UserRole.employer)


@pytest.fixture
async def student(make_user, make_session) -> Account:
    return await _signed_in(make_user, make_session, "maya@sdu.edu.kz", UserRole.student)


@pytest.fixture
async def student_with_profile(make_user, make_session, make_student_profile) -> Account:
    account = await _signed_in(make_user, make_session, "aru@sdu.edu.kz", UserRole.student)
    await make_student_profile(account.user)
    return account


@pytest.fixture
def freeze_now():
    """Pins the clock the vacancy routes use (the `now_utc` dependency): freeze_now(datetime(..., tzinfo=UTC))."""
    from src.vacancies.deadlines import now_utc

    def _freeze(moment: datetime) -> None:
        app.dependency_overrides[now_utc] = lambda: moment

    yield _freeze
    app.dependency_overrides.pop(now_utc, None)


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
