import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash

from src.config import settings

password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_verification_code(email: str, code: str) -> str:
    normalized_email = email.strip().lower()

    message = f"{normalized_email}:{code}".encode()

    secret = settings.secret_key.get_secret_value().encode()

    return hmac.new(secret, message, hashlib.sha256).hexdigest()


def verify_code(email: str, code: str, hashed_code: str) -> bool:
    expected_hash = hash_verification_code(email, code)
    return hmac.compare_digest(expected_hash, hashed_code)


def create_access_token(data: dict, expires_delta: int | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + timedelta(minutes=expires_delta)
    else:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.access_token_expire_minutes,
        )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key.get_secret_value(),
        algorithm="HS256",
    )

    return encoded_jwt


def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=["HS256"],
            options={"sub", "exp"},
        )
    except jwt.InvalidTokenError:
        return None
    else:
        return payload.get("sub")
