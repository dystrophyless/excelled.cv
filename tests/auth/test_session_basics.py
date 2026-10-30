from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends
from sqlalchemy import update

from src.auth.dependencies import CurrentAccount, require_role
from src.auth.models import Session
from src.main import app
from src.users.models import UserRole

from ..conftest import cookie


# Test-only routes for the role guard (the real role-specific routes arrive with later features).
@app.get("/api/_test/student-only")
async def _student_only(
    account: Annotated[CurrentAccount, Depends(require_role("student"))],
):
    return {"id": account.user.id}


@app.get("/api/_test/employer-only")
async def _employer_only(
    account: Annotated[CurrentAccount, Depends(require_role("employer"))],
):
    return {"id": account.user.id}


@app.post("/api/_test/echo", status_code=204)
async def _echo():
    return None


async def test_me_without_cookie_is_401(client):
    response = await client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_signed_in"


async def test_me_with_valid_session(client, make_user, make_session):
    user = await make_user()
    _, raw = await make_session(user)

    response = await client.get("/api/auth/me", headers=cookie(raw))

    assert response.status_code == 200
    assert response.json() == {
        "account": {"id": user.id, "email": "maya@sdu.edu.kz", "role": "student"}
    }


async def test_me_with_unknown_cookie_is_401(client):
    response = await client.get("/api/auth/me", headers=cookie("not-a-real-token"))

    assert response.status_code == 401


async def test_me_with_expired_session_is_401(client, db, make_user, make_session):
    user = await make_user()
    session, raw = await make_session(user)
    await db.execute(
        update(Session)
        .where(Session.id == session.id)
        .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
    )
    await db.commit()

    response = await client.get("/api/auth/me", headers=cookie(raw))

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_signed_in"


async def test_me_with_revoked_session_is_401(client, db, make_user, make_session):
    user = await make_user()
    session, raw = await make_session(user)
    await db.execute(
        update(Session)
        .where(Session.id == session.id)
        .values(revoked_at=datetime.now(UTC))
    )
    await db.commit()

    response = await client.get("/api/auth/me", headers=cookie(raw))

    assert response.status_code == 401


async def test_session_lasts_30_days_and_stores_only_a_hash(db, make_user, make_session):
    user = await make_user()
    session, raw = await make_session(user)

    lifetime = session.expires_at - session.created_at
    assert timedelta(days=29, hours=23) < lifetime <= timedelta(days=30, minutes=1)
    assert session.token_hash != raw
    assert len(session.token_hash) == 64


async def test_post_from_a_foreign_origin_is_403(client):
    response = await client.post(
        "/api/_test/echo",
        headers={"Origin": "https://evil.example"},
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "origin_not_allowed"


async def test_post_without_origin_or_referer_is_403(client):
    response = await client.post(
        "/api/_test/echo",
        headers={"Origin": ""},
    )

    assert response.status_code == 403


async def test_post_with_matching_referer_is_allowed(client):
    response = await client.post(
        "/api/_test/echo",
        headers={"Origin": "", "Referer": "http://localhost:5173/app"},
    )

    assert response.status_code == 204


async def test_get_is_not_origin_checked(client):
    response = await client.get("/api/auth/me", headers={"Origin": "https://evil.example"})

    assert response.status_code == 401  # reached the handler, not blocked


async def test_role_guard(client, make_user, make_session):
    student = await make_user(email="s@sdu.edu.kz", role=UserRole.student)
    employer = await make_user(email="e@kaspi.kz", role=UserRole.employer)
    _, student_cookie = await make_session(student)
    _, employer_cookie = await make_session(employer)

    anonymous = await client.get("/api/_test/student-only")
    assert anonymous.status_code == 401
    assert anonymous.json()["detail"]["code"] == "not_signed_in"

    ok = await client.get("/api/_test/student-only", headers=cookie(student_cookie))
    assert ok.status_code == 200

    wrong = await client.get("/api/_test/student-only", headers=cookie(employer_cookie))
    assert wrong.status_code == 403
    assert wrong.json()["detail"]["code"] == "wrong_role"

    ok_employer = await client.get("/api/_test/employer-only", headers=cookie(employer_cookie))
    assert ok_employer.status_code == 200


async def test_employer_account_passes_its_own_guard_and_not_the_students(client, make_user, make_session):
    employer = await make_user(email="hr@kaspi.kz", role=UserRole.employer)
    _, raw = await make_session(employer)

    assert (await client.get("/api/_test/employer-only", headers=cookie(raw))).status_code == 200
    blocked = await client.get("/api/_test/student-only", headers=cookie(raw))
    assert blocked.status_code == 403
    assert blocked.json()["detail"]["code"] == "wrong_role"
