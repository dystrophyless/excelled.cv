from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import codes, sessions, throttle
from src.auth.dependencies import CurrentAccount, current_account
from src.auth.emailer import send_password_reset_email, send_verification_email
from src.auth.exceptions import api_error
from src.auth.models import PasswordResetRequest, PendingUser
from src.auth.repository import (
    get_pending_user_by_email,
    get_reset_request_by_email,
    get_reset_request_by_token_hash,
)
from src.auth.schemas import (
    AccountOut,
    AccountResponse,
    CodeSentResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequestIn,
    PasswordResetVerifyRequest,
    PasswordResetVerifyResponse,
    RegisterResponse,
    ResendCodeRequest,
    UserRegisterRequest,
    VerifyEmailRequest,
)
from src.auth.utils import (
    hash_password,
    hash_token,
    new_token,
    normalize_email,
    verify_password,
    verify_password_dummy,
)
from src.database import get_session
from src.users.models import User
from src.users.repository import (
    add_user,
    check_if_user_exists_by_email,
    get_user_by_email,
)

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_session)]


def account_response(user: User) -> AccountResponse:
    return AccountResponse(account=AccountOut(id=user.id, email=user.email, role=user.role))


def resend_too_soon(retry_after: int):
    return api_error(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "resend_too_soon",
        "A code was sent a moment ago. Wait before asking for another one.",
        retry_after=retry_after,
    )


def nothing_pending():
    return api_error(
        status.HTTP_400_BAD_REQUEST,
        "nothing_pending",
        "There is no sign-up waiting for a code. Start again.",
    )


# ---- sign-up ---------------------------------------------------------------------------------


@router.post(
    "/register",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=RegisterResponse,
)
async def register_user(
    user_data: UserRegisterRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    email = normalize_email(user_data.email)

    if await check_if_user_exists_by_email(db, email=email):
        raise api_error(
            status.HTTP_409_CONFLICT,
            "email_taken",
            "An account already exists for this email.",
        )

    now = datetime.now(UTC)
    pending = await get_pending_user_by_email(db, email=email)

    # A code was sent less than a minute ago: refuse with the remaining wait (FR-004).
    if pending is not None:
        wait = codes.cooldown_left(pending.last_sent_at, now)
        if wait:
            raise resend_too_soon(wait)

    issued = codes.issue(email, now)

    if pending is None:
        pending = PendingUser(
            email=email,
            hashed_password=hash_password(user_data.password),
            role=user_data.role,
            hashed_code=issued.hashed_code,
            expires_at=issued.expires_at,
            last_sent_at=issued.last_sent_at,
        )
        db.add(pending)
    else:
        # Starting again replaces password, role and code; the previous code stops working.
        pending.hashed_password = hash_password(user_data.password)
        pending.role = user_data.role
        codes.apply(pending, issued)

    try:
        await db.commit()
    except IntegrityError:
        # Two sign-ups for one email at the same moment: the other one won, update its row.
        await db.rollback()
        pending = await get_pending_user_by_email(db, email=email)

        if pending is None:
            raise

        pending.hashed_password = hash_password(user_data.password)
        pending.role = user_data.role
        codes.apply(pending, issued)
        await db.commit()

    background_tasks.add_task(send_verification_email, to=email, code=issued.code)

    return RegisterResponse(email=email, resend_in=codes.RESEND_IN, expires_in=codes.EXPIRES_IN)


@router.post(
    "/resend-code",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=CodeSentResponse,
)
async def resend_code(
    data: ResendCodeRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    email = normalize_email(data.email)

    if data.purpose == "password_reset":
        # Neutral on purpose: always the same 202, whether or not a code was actually sent.
        await start_password_reset(db, background_tasks, email)
        return CodeSentResponse(resend_in=codes.RESEND_IN, expires_in=codes.EXPIRES_IN)

    pending = await get_pending_user_by_email(db, email=email)
    if pending is None:
        raise api_error(
            status.HTTP_404_NOT_FOUND,
            "nothing_pending",
            "There is no sign-up waiting for a code. Start again.",
        )

    now = datetime.now(UTC)
    wait = codes.cooldown_left(pending.last_sent_at, now)
    if wait:
        raise resend_too_soon(wait)

    issued = codes.issue(email, now)
    codes.apply(pending, issued)
    await db.commit()

    background_tasks.add_task(send_verification_email, to=email, code=issued.code)

    return CodeSentResponse(resend_in=codes.RESEND_IN, expires_in=codes.EXPIRES_IN)


@router.post(
    "/verify-email",
    response_model=AccountResponse,
)
async def verify_email(
    data: VerifyEmailRequest,
    request: Request,
    response: Response,
    db: DbSession,
):
    email = normalize_email(data.email)

    pending = await get_pending_user_by_email(db, email=email)
    if pending is None:
        raise nothing_pending()

    result = codes.check(pending, email, data.code)

    if result.outcome is codes.Outcome.EXPIRED:
        # Kept on purpose: "Send a new code" needs the pending sign-up.
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "code_expired",
            "That code has expired.",
        )

    if result.outcome is codes.Outcome.TOO_MANY:
        await db.delete(pending)
        await db.commit()
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "too_many_attempts",
            "Too many wrong codes. Start again.",
        )

    if result.outcome is codes.Outcome.INVALID:
        await db.commit()  # keeps the counted attempt
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "invalid_code",
            "That code didn't work.",
            attempts_left=result.attempts_left,
        )

    try:
        user = await add_user(
            db,
            email=email,
            username=None,
            hashed_password=pending.hashed_password,
            role=pending.role,
        )
        await db.delete(pending)
        await db.flush()
        _, raw = await sessions.create_session(db, user, request.headers.get("user-agent"))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise api_error(
            status.HTTP_409_CONFLICT,
            "email_taken",
            "An account already exists for this email.",
        )

    sessions.set_cookie(response, raw)
    return account_response(user)


# ---- sign-in and sign-out --------------------------------------------------------------------


def sign_in_locked(retry_after: int):
    return api_error(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "sign_in_locked",
        "Too many wrong passwords. Sign-in is paused for a while.",
        retry_after=retry_after,
    )


@router.post("/token", response_model=AccountResponse)
async def sign_in(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    request: Request,
    response: Response,
    db: DbSession,
):
    email = normalize_email(form_data.username)

    # While paused the password is not even checked (FR-009a).
    wait = await throttle.check(db, email)
    if wait is not None:
        raise sign_in_locked(wait)

    user = await get_user_by_email(db, email=email)

    if user is None:
        verify_password_dummy(form_data.password)  # same cost as a real check
        password_ok = False
    else:
        password_ok = verify_password(form_data.password, user.hashed_password)

    if not password_ok:
        locked_for = await throttle.fail(db, email)
        if locked_for is not None:
            raise sign_in_locked(locked_for)

        # One neutral answer for a wrong password and for an unknown email (FR-009).
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "invalid_credentials",
            "Wrong email or password.",
        )

    await throttle.clear(db, email)
    _, raw = await sessions.create_session(db, user, request.headers.get("user-agent"))
    await db.commit()

    sessions.set_cookie(response, raw)
    return account_response(user)


@router.post("/sign-out", status_code=status.HTTP_204_NO_CONTENT)
async def sign_out(
    db: DbSession,
    novio_session: Annotated[str | None, Cookie()] = None,
):
    """Ends this device's session. Idempotent: always 204, with or without a session."""
    resolved = await sessions.resolve(db, novio_session)
    if resolved is not None:
        await sessions.revoke(db, resolved[0])
        await db.commit()

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    sessions.clear_cookie(response)
    return response


# ---- session ---------------------------------------------------------------------------------


@router.get("/me", response_model=AccountResponse)
async def me(account: Annotated[CurrentAccount, Depends(current_account)]):
    return account_response(account.user)


# ---- password reset --------------------------------------------------------------------------


async def start_password_reset(
    db: AsyncSession,
    background_tasks: BackgroundTasks,
    email: str,
) -> None:
    """Issues a reset code for an email. Never tells the caller whether anything was sent (SC-005):
    an unknown email gets a decoy request (no email goes out) so later steps behave identically."""
    now = datetime.now(UTC)
    user = await get_user_by_email(db, email=email)
    request = await get_reset_request_by_email(db, email=email)

    if request is not None and codes.cooldown_left(request.last_sent_at, now):
        return

    issued = codes.issue(email, now)
    user_id = user.id if user is not None else None

    if request is None:
        db.add(
            PasswordResetRequest(
                email=email,
                user_id=user_id,
                hashed_code=issued.hashed_code,
                expires_at=issued.expires_at,
                last_sent_at=issued.last_sent_at,
            )
        )
    else:
        codes.apply(request, issued)
        request.user_id = user_id
        request.verified_at = None
        request.reset_token_hash = None
        request.reset_token_expires_at = None

    try:
        await db.commit()
    except IntegrityError:
        # a parallel request for the same email won; the caller still gets the neutral answer
        await db.rollback()
        return

    if user is not None:
        background_tasks.add_task(send_password_reset_email, to=email, code=issued.code)


@router.post(
    "/password-reset/request",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=CodeSentResponse,
)
async def password_reset_request(
    data: PasswordResetRequestIn,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    await start_password_reset(db, background_tasks, normalize_email(data.email))
    return CodeSentResponse(resend_in=codes.RESEND_IN, expires_in=codes.EXPIRES_IN)


@router.post(
    "/password-reset/verify",
    response_model=PasswordResetVerifyResponse,
)
async def password_reset_verify(
    data: PasswordResetVerifyRequest,
    db: DbSession,
):
    email = normalize_email(data.email)

    too_many = api_error(
        status.HTTP_400_BAD_REQUEST,
        "too_many_attempts",
        "That code can't be used. Request a new one.",
    )

    request = await get_reset_request_by_email(db, email=email)
    if request is None:
        raise too_many  # nothing pending looks exactly like a used-up request

    result = codes.check(request, email, data.code)

    if result.outcome is codes.Outcome.EXPIRED:
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "code_expired",
            "That code has expired.",
        )

    if result.outcome is codes.Outcome.TOO_MANY:
        await db.delete(request)
        await db.commit()
        raise too_many

    if result.outcome is codes.Outcome.INVALID:
        await db.commit()
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "invalid_code",
            "That code didn't work.",
            attempts_left=result.attempts_left,
        )

    now = datetime.now(UTC)
    token = new_token()
    request.verified_at = now
    request.reset_token_hash = hash_token(token)
    request.reset_token_expires_at = now + codes.CODE_TTL
    await db.commit()

    return PasswordResetVerifyResponse(reset_token=token, expires_in=codes.EXPIRES_IN)


@router.post(
    "/password-reset/confirm",
    response_model=AccountResponse,
)
async def password_reset_confirm(
    data: PasswordResetConfirmRequest,
    request: Request,
    response: Response,
    db: DbSession,
):
    invalid = api_error(
        status.HTTP_400_BAD_REQUEST,
        "reset_token_invalid",
        "This reset session has ended. Start again.",
    )

    reset = await get_reset_request_by_token_hash(db, token_hash=hash_token(data.reset_token))
    now = datetime.now(UTC)

    if (
        reset is None
        or reset.user_id is None
        or reset.reset_token_expires_at is None
        or reset.reset_token_expires_at <= now
    ):
        raise invalid

    user = await db.get(User, reset.user_id)
    if user is None:
        raise invalid

    user.hashed_password = hash_password(data.password)
    user.password_changed_at = now
    await db.delete(reset)  # the token is single-use
    await throttle.clear(db, user.email)

    session, raw = await sessions.create_session(db, user, request.headers.get("user-agent"))
    await sessions.revoke_all_except(db, user.id, session.id)
    await db.commit()

    sessions.set_cookie(response, raw)
    return account_response(user)
