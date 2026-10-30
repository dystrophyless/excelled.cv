from datetime import UTC, datetime, timedelta
from http.cookies import SimpleCookie

from sqlalchemy import select, update

from src.auth.models import PendingUser
from src.users.models import User, UserRole

from ..conftest import cookie

PASSWORD = "correct-horse"


async def register(client, email="maya@sdu.edu.kz", password=PASSWORD, role="student"):
    return await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "role": role},
    )


async def verify(client, email, code):
    return await client.post("/api/auth/verify-email", json={"email": email, "code": code})


async def resend(client, email, purpose="sign_up"):
    return await client.post("/api/auth/resend-code", json={"email": email, "purpose": purpose})


async def age_pending(db, email, **values):
    await db.execute(update(PendingUser).where(PendingUser.email == email).values(**values))
    await db.commit()


async def pending_count(db) -> int:
    return len((await db.execute(select(PendingUser))).scalars().all())


def session_cookie(response) -> SimpleCookie:
    jar = SimpleCookie()
    jar.load(response.headers["set-cookie"])
    return jar


# ---- /register -------------------------------------------------------------------------------


async def test_register_sends_a_code(client, sent_emails, db):
    response = await register(client, email="Maya@SDU.edu.kz")

    assert response.status_code == 202
    assert response.json() == {"email": "maya@sdu.edu.kz", "resend_in": 60, "expires_in": 600}
    assert len(sent_emails) == 1
    assert sent_emails[0]["to"] == "maya@sdu.edu.kz"
    assert len(sent_emails[0]["code"]) == 6
    pending = (await db.execute(select(PendingUser))).scalar_one()
    assert pending.role == UserRole.student
    assert pending.hashed_password != PASSWORD


async def test_register_rejects_a_short_password(client, sent_emails):
    response = await register(client, password="short")

    assert response.status_code == 422
    assert sent_emails == []


async def test_register_rejects_an_unknown_role(client):
    response = await register(client, role="admin")

    assert response.status_code == 422


async def test_register_existing_account_is_409(client, make_user, sent_emails):
    await make_user(email="maya@sdu.edu.kz")

    response = await register(client, email="MAYA@sdu.edu.kz")

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "email_taken"
    assert sent_emails == []


async def test_register_again_within_a_minute_is_429(client, sent_emails):
    await register(client)

    response = await register(client)

    assert response.status_code == 429
    detail = response.json()["detail"]
    assert detail["code"] == "resend_too_soon"
    assert 1 <= detail["retry_after"] <= 60
    assert len(sent_emails) == 1


async def test_register_again_after_the_cooldown_replaces_everything(client, sent_emails, db):
    await register(client, password=PASSWORD, role="student")
    old_code = sent_emails[0]["code"]
    await age_pending(db, "maya@sdu.edu.kz", last_sent_at=datetime.now(UTC) - timedelta(seconds=61))

    response = await register(client, password="another-password", role="employer")
    new_code = sent_emails[1]["code"]

    assert response.status_code == 202
    assert await pending_count(db) == 1
    # the old code stops working, the new one creates an employer account
    if old_code != new_code:
        assert (await verify(client, "maya@sdu.edu.kz", old_code)).status_code == 400
    ok = await verify(client, "maya@sdu.edu.kz", new_code)
    assert ok.status_code == 200
    assert ok.json()["account"]["role"] == "employer"


# ---- /resend-code (sign_up) ------------------------------------------------------------------


async def test_resend_without_pending_sign_up_is_404(client, sent_emails):
    response = await resend(client, "nobody@sdu.edu.kz")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "nothing_pending"
    assert sent_emails == []


async def test_resend_inside_the_cooldown_is_429(client, sent_emails):
    await register(client)

    response = await resend(client, "maya@sdu.edu.kz")

    assert response.status_code == 429
    assert response.json()["detail"]["code"] == "resend_too_soon"
    assert len(sent_emails) == 1


async def test_resend_after_the_cooldown_sends_a_new_code_and_resets_attempts(client, sent_emails, db):
    await register(client)
    await verify(client, "maya@sdu.edu.kz", "000000")  # a wrong attempt
    await age_pending(db, "maya@sdu.edu.kz", last_sent_at=datetime.now(UTC) - timedelta(seconds=61))

    response = await resend(client, "maya@sdu.edu.kz")

    assert response.status_code == 202
    assert response.json() == {"resend_in": 60, "expires_in": 600}
    assert len(sent_emails) == 2
    pending = (await db.execute(select(PendingUser))).scalar_one()
    assert pending.attempts == 0
    assert (await verify(client, "maya@sdu.edu.kz", sent_emails[1]["code"])).status_code == 200


# ---- /verify-email ---------------------------------------------------------------------------


async def test_verify_creates_the_account_and_signs_in(client, sent_emails, db):
    await register(client, email="Maya@SDU.edu.kz")

    response = await verify(client, "maya@sdu.edu.kz", sent_emails[0]["code"])

    assert response.status_code == 200
    account = response.json()["account"]
    assert account["email"] == "maya@sdu.edu.kz"
    assert account["role"] == "student"

    header = response.headers["set-cookie"].lower()
    assert "novio_session=" in header
    assert "httponly" in header
    assert "path=/api" in header
    assert "max-age=2592000" in header
    assert "samesite=lax" in header

    assert await pending_count(db) == 0
    assert (await db.execute(select(User))).scalar_one().email == "maya@sdu.edu.kz"

    me = await client.get("/api/auth/me", headers=cookie(session_cookie(response)["novio_session"].value))
    assert me.status_code == 200
    assert me.json()["account"] == account


async def test_verify_wrong_code_counts_attempts_then_cancels(client, sent_emails, db):
    await register(client)
    code = sent_emails[0]["code"]
    wrong = "000000" if code != "000000" else "111111"

    first = await verify(client, "maya@sdu.edu.kz", wrong)
    second = await verify(client, "maya@sdu.edu.kz", wrong)
    third = await verify(client, "maya@sdu.edu.kz", wrong)

    assert first.status_code == 400
    assert first.json()["detail"] == {
        "code": "invalid_code",
        "message": first.json()["detail"]["message"],
        "attempts_left": 2,
    }
    assert second.json()["detail"]["attempts_left"] == 1
    assert third.status_code == 400
    assert third.json()["detail"]["code"] == "too_many_attempts"
    assert await pending_count(db) == 0

    # the right code no longer works: the sign-up was cancelled
    late = await verify(client, "maya@sdu.edu.kz", code)
    assert late.status_code == 400
    assert late.json()["detail"]["code"] == "nothing_pending"


async def test_verify_after_ten_minutes_is_code_expired_and_resend_still_works(client, sent_emails, db):
    await register(client)
    await age_pending(
        db,
        "maya@sdu.edu.kz",
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
        last_sent_at=datetime.now(UTC) - timedelta(minutes=11),
    )

    response = await verify(client, "maya@sdu.edu.kz", sent_emails[0]["code"])

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "code_expired"

    # "Send a new code" needs the pending sign-up to still be there
    assert (await resend(client, "maya@sdu.edu.kz")).status_code == 202
    assert (await verify(client, "maya@sdu.edu.kz", sent_emails[1]["code"])).status_code == 200


async def test_verify_unknown_email_is_nothing_pending(client):
    response = await verify(client, "nobody@sdu.edu.kz", "123456")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "nothing_pending"


async def test_verify_rejects_a_malformed_code(client):
    response = await verify(client, "maya@sdu.edu.kz", "12ab")

    assert response.status_code == 422


# ---- employer sign-up (US3) ------------------------------------------------------------------


async def test_employer_sign_up_creates_an_employer_account(client, sent_emails, db):
    await register(client, email="hr@kaspi.kz", role="employer")

    response = await verify(client, "hr@kaspi.kz", sent_emails[0]["code"])

    assert response.status_code == 200
    assert response.json()["account"]["role"] == "employer"
    assert (await db.execute(select(User))).scalar_one().role == UserRole.employer


async def test_the_chosen_role_is_required(client):
    response = await client.post(
        "/api/auth/register",
        json={"email": "maya@sdu.edu.kz", "password": PASSWORD},
    )

    assert response.status_code == 422
