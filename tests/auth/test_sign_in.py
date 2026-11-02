from datetime import UTC, datetime, timedelta
from http.cookies import SimpleCookie

from sqlalchemy import select, update

from src.auth.models import Session, SignInThrottle

from ..conftest import cookie

PASSWORD = "correct-horse"


async def sign_in(client, email="maya@sdu.edu.kz", password=PASSWORD):
    # the existing endpoint takes the OAuth2 password form: username=<email>&password=<password>
    return await client.post("/api/auth/token", data={"username": email, "password": password})


def raw_cookie(response) -> str:
    jar = SimpleCookie()
    jar.load(response.headers["set-cookie"])
    return jar["novio_session"].value


async def fail_n_times(client, n, email="maya@sdu.edu.kz"):
    last = None
    for _ in range(n):
        last = await sign_in(client, email=email, password="wrong-password")
    return last


# ---- /token ----------------------------------------------------------------------------------


async def test_sign_in_sets_a_session_cookie(client, make_user):
    user = await make_user()

    response = await sign_in(client)

    assert response.status_code == 200
    assert response.json() == {"account": {"id": user.id, "email": "maya@sdu.edu.kz", "role": "student"}}
    header = response.headers["set-cookie"].lower()
    assert "httponly" in header and "path=/api" in header and "max-age=2592000" in header

    me = await client.get("/api/auth/me", headers=cookie(raw_cookie(response)))
    assert me.status_code == 200


async def test_sign_in_is_case_insensitive(client, make_user):
    await make_user(email="maya@sdu.edu.kz")

    response = await sign_in(client, email="MAYA@SDU.EDU.KZ")

    assert response.status_code == 200


async def test_wrong_password_and_unknown_email_look_identical(client, make_user):
    await make_user()

    wrong_password = await sign_in(client, password="not-the-password")
    unknown_email = await sign_in(client, email="nobody@sdu.edu.kz")

    assert wrong_password.status_code == unknown_email.status_code == 400
    assert wrong_password.json() == unknown_email.json()
    assert wrong_password.json()["detail"]["code"] == "invalid_credentials"
    assert "set-cookie" not in wrong_password.headers


# ---- throttling (FR-009a) --------------------------------------------------------------------


async def test_five_failures_lock_sign_in_for_15_minutes(client, make_user):
    await make_user()

    fourth = await fail_n_times(client, 4)
    assert fourth.status_code == 400

    fifth = await sign_in(client, password="wrong-password")
    assert fifth.status_code == 429
    detail = fifth.json()["detail"]
    assert detail["code"] == "sign_in_locked"
    assert 890 <= detail["retry_after"] <= 900

    # the correct password is refused during the pause
    correct = await sign_in(client)
    assert correct.status_code == 429
    assert correct.json()["detail"]["code"] == "sign_in_locked"


async def test_unknown_emails_lock_too_so_the_pause_reveals_nothing(client):
    last = await fail_n_times(client, 5, email="nobody@sdu.edu.kz")

    assert last.status_code == 429
    assert last.json()["detail"]["code"] == "sign_in_locked"


async def test_the_pause_ends_after_15_minutes(client, make_user, db):
    await make_user()
    await fail_n_times(client, 5)
    await db.execute(update(SignInThrottle).values(locked_until=datetime.now(UTC) - timedelta(seconds=1)))
    await db.commit()

    response = await sign_in(client)

    assert response.status_code == 200


async def test_success_clears_the_failure_count(client, make_user, db):
    await make_user()
    await fail_n_times(client, 4)

    assert (await sign_in(client)).status_code == 200
    assert (await db.execute(select(SignInThrottle))).scalars().all() == []

    # four more failures are fine again — the count started over
    assert (await fail_n_times(client, 4)).status_code == 400


async def test_the_throttle_is_per_email(client, make_user):
    await make_user(email="maya@sdu.edu.kz")
    await make_user(email="other@sdu.edu.kz")
    await fail_n_times(client, 5, email="maya@sdu.edu.kz")

    response = await sign_in(client, email="other@sdu.edu.kz")

    assert response.status_code == 200


# ---- /sign-out -------------------------------------------------------------------------------


async def test_sign_out_revokes_the_session_and_clears_the_cookie(client, make_user, make_session, db):
    user = await make_user()
    session, raw = await make_session(user)

    response = await client.post("/api/auth/sign-out", headers=cookie(raw))

    assert response.status_code == 204
    assert "novio_session=" in response.headers["set-cookie"]
    assert "max-age=0" in response.headers["set-cookie"].lower()
    assert (await client.get("/api/auth/me", headers=cookie(raw))).status_code == 401
    revoked = (await db.execute(select(Session).where(Session.id == session.id))).scalar_one()
    assert revoked.revoked_at is not None


async def test_sign_out_without_a_session_is_still_204(client):
    response = await client.post("/api/auth/sign-out")

    assert response.status_code == 204


async def test_sign_out_only_ends_this_device(client, make_user, make_session):
    user = await make_user()
    _, here = await make_session(user)
    _, elsewhere = await make_session(user)

    await client.post("/api/auth/sign-out", headers=cookie(here))

    assert (await client.get("/api/auth/me", headers=cookie(elsewhere))).status_code == 200
