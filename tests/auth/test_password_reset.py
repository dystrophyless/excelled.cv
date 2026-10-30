from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from src.auth.models import PasswordResetRequest
from src.users.models import User

from ..conftest import cookie

PASSWORD = "correct-horse"
NEW_PASSWORD = "brand-new-password"
EMAIL = "maya@sdu.edu.kz"


async def request_reset(client, email=EMAIL):
    return await client.post("/api/auth/password-reset/request", json={"email": email})


async def verify_reset(client, code, email=EMAIL):
    return await client.post("/api/auth/password-reset/verify", json={"email": email, "code": code})


async def confirm_reset(client, token, password=NEW_PASSWORD):
    return await client.post(
        "/api/auth/password-reset/confirm",
        json={"reset_token": token, "password": password},
    )


async def resend_reset(client, email=EMAIL):
    return await client.post("/api/auth/resend-code", json={"email": email, "purpose": "password_reset"})


async def sign_in(client, password, email=EMAIL):
    return await client.post("/api/auth/token", data={"username": email, "password": password})


async def age_request(db, email=EMAIL, **values):
    await db.execute(update(PasswordResetRequest).where(PasswordResetRequest.email == email).values(**values))
    await db.commit()


def wrong_code(real: str | None) -> str:
    return "000000" if real != "000000" else "111111"


# ---- step 1: request -------------------------------------------------------------------------


async def test_request_for_an_existing_account_sends_a_code(client, make_user, sent_emails):
    await make_user()

    response = await request_reset(client, "Maya@SDU.edu.kz")

    assert response.status_code == 202
    assert response.json() == {"resend_in": 60, "expires_in": 600}
    assert len(sent_emails) == 1
    assert sent_emails[0]["to"] == EMAIL
    assert len(sent_emails[0]["code"]) == 6


async def test_request_responses_are_identical_for_known_unknown_and_cooldown(client, make_user, sent_emails):
    await make_user()

    known = await request_reset(client)
    in_cooldown = await request_reset(client)
    unknown = await request_reset(client, "nobody@sdu.edu.kz")

    assert known.status_code == in_cooldown.status_code == unknown.status_code == 202
    assert known.json() == in_cooldown.json() == unknown.json()
    assert len(sent_emails) == 1  # nothing sent for the unknown email or inside the cooldown


async def test_resend_for_password_reset_is_always_202(client, make_user, sent_emails):
    await make_user()
    await request_reset(client)

    in_cooldown = await resend_reset(client)
    unknown = await resend_reset(client, "nobody@sdu.edu.kz")

    assert in_cooldown.status_code == unknown.status_code == 202
    assert in_cooldown.json() == unknown.json() == {"resend_in": 60, "expires_in": 600}
    assert len(sent_emails) == 1


async def test_resend_after_the_cooldown_sends_a_new_code_and_the_old_one_stops_working(
    client, make_user, sent_emails, db
):
    await make_user()
    await request_reset(client)
    old = sent_emails[0]["code"]
    await age_request(db, last_sent_at=datetime.now(UTC) - timedelta(seconds=61))

    response = await resend_reset(client)

    assert response.status_code == 202
    assert len(sent_emails) == 2
    new = sent_emails[1]["code"]
    if old != new:
        assert (await verify_reset(client, old)).status_code == 400
    assert (await verify_reset(client, new)).status_code == 200


# ---- step 2: verify the code -----------------------------------------------------------------


async def test_verify_with_the_right_code_returns_a_reset_token(client, make_user, sent_emails):
    await make_user()
    await request_reset(client)

    response = await verify_reset(client, sent_emails[0]["code"])

    assert response.status_code == 200
    body = response.json()
    assert body["expires_in"] == 600
    assert len(body["reset_token"]) >= 32
    assert "set-cookie" not in response.headers  # not signed in yet


async def test_verify_wrong_codes_count_attempts_then_cancel(client, make_user, sent_emails, db):
    await make_user()
    await request_reset(client)
    wrong = wrong_code(sent_emails[0]["code"])

    first = await verify_reset(client, wrong)
    second = await verify_reset(client, wrong)
    third = await verify_reset(client, wrong)

    assert first.status_code == 400
    assert first.json()["detail"]["code"] == "invalid_code"
    assert first.json()["detail"]["attempts_left"] == 2
    assert second.json()["detail"]["attempts_left"] == 1
    assert third.json()["detail"]["code"] == "too_many_attempts"
    # the right code is useless once the request was cancelled
    late = await verify_reset(client, sent_emails[0]["code"])
    assert late.json()["detail"]["code"] == "too_many_attempts"


async def test_unknown_email_behaves_exactly_like_a_known_one(client, make_user, sent_emails):
    """SC-005: an attacker must not be able to tell the two apart by guessing codes."""
    await make_user()
    await request_reset(client)
    await request_reset(client, "nobody@sdu.edu.kz")
    wrong = wrong_code(sent_emails[0]["code"])

    known = [await verify_reset(client, wrong) for _ in range(3)]
    unknown = [await verify_reset(client, wrong, email="nobody@sdu.edu.kz") for _ in range(3)]

    def shape(responses):
        return [
            (r.status_code, r.json()["detail"]["code"], r.json()["detail"].get("attempts_left"))
            for r in responses
        ]

    assert shape(known) == shape(unknown)


async def test_verify_without_any_request_is_too_many_attempts(client):
    response = await verify_reset(client, "123456", email="never-asked@sdu.edu.kz")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "too_many_attempts"


async def test_verify_after_ten_minutes_is_code_expired(client, make_user, sent_emails, db):
    await make_user()
    await request_reset(client)
    await age_request(
        db,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
        last_sent_at=datetime.now(UTC) - timedelta(minutes=11),
    )

    response = await verify_reset(client, sent_emails[0]["code"])

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "code_expired"
    # a new code can be requested without retyping anything
    assert (await resend_reset(client)).status_code == 202
    assert (await verify_reset(client, sent_emails[1]["code"])).status_code == 200


# ---- step 3: confirm -------------------------------------------------------------------------


async def reset_to_token(client, sent_emails) -> str:
    await request_reset(client)
    verified = await verify_reset(client, sent_emails[-1]["code"])
    return verified.json()["reset_token"]


async def test_confirm_replaces_the_password_and_signs_in_this_device(
    client, make_user, make_session, sent_emails, db
):
    user = await make_user()
    _, other_device = await make_session(user)
    token = await reset_to_token(client, sent_emails)

    response = await confirm_reset(client, token)

    assert response.status_code == 200
    assert response.json()["account"]["email"] == EMAIL
    assert "novio_session=" in response.headers["set-cookie"]

    # the resetting device is signed in; the other device was signed out
    here = response.headers["set-cookie"].split("novio_session=")[1].split(";")[0]
    assert (await client.get("/api/auth/me", headers=cookie(here))).status_code == 200
    assert (await client.get("/api/auth/me", headers=cookie(other_device))).status_code == 401

    # new password works, old one does not
    assert (await sign_in(client, NEW_PASSWORD)).status_code == 200
    assert (await sign_in(client, PASSWORD)).status_code == 400

    refreshed = (await db.execute(select(User).execution_options(populate_existing=True))).scalar_one()
    assert refreshed.password_changed_at is not None
    assert (await db.execute(select(PasswordResetRequest))).scalars().all() == []


async def test_reset_token_is_single_use(client, make_user, sent_emails):
    await make_user()
    token = await reset_to_token(client, sent_emails)
    await confirm_reset(client, token)

    again = await confirm_reset(client, token, password="yet-another-password")

    assert again.status_code == 400
    assert again.json()["detail"]["code"] == "reset_token_invalid"


async def test_unknown_reset_token_is_invalid(client):
    response = await confirm_reset(client, "x" * 43)

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "reset_token_invalid"


async def test_reset_token_expires_after_ten_minutes(client, make_user, sent_emails, db):
    await make_user()
    token = await reset_to_token(client, sent_emails)
    await age_request(db, reset_token_expires_at=datetime.now(UTC) - timedelta(seconds=1))

    response = await confirm_reset(client, token)

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "reset_token_invalid"
    assert (await sign_in(client, PASSWORD)).status_code == 200  # password unchanged


async def test_confirm_enforces_the_password_length_rule(client, make_user, sent_emails):
    await make_user()
    token = await reset_to_token(client, sent_emails)

    response = await confirm_reset(client, token, password="short")

    assert response.status_code == 422
    # the token survives a rejected password
    assert (await confirm_reset(client, token)).status_code == 200


async def test_a_decoy_request_can_never_produce_a_token(client, sent_emails):
    await request_reset(client, "nobody@sdu.edu.kz")

    for guess in ("000000", "123456", "999999"):
        response = await verify_reset(client, guess, email="nobody@sdu.edu.kz")
        assert response.status_code == 400
        assert "reset_token" not in response.text
    assert sent_emails == []


async def test_reset_works_while_sign_in_is_locked_and_clears_the_lock(client, make_user, sent_emails):
    await make_user()
    for _ in range(5):
        await sign_in(client, "wrong-password")
    assert (await sign_in(client, PASSWORD)).status_code == 429

    token = await reset_to_token(client, sent_emails)
    assert (await confirm_reset(client, token)).status_code == 200

    assert (await sign_in(client, NEW_PASSWORD)).status_code == 200
