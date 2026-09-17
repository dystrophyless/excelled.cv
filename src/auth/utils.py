import hashlib
import hmac
import secrets

from pwdlib import PasswordHash

from src.config import settings

password_hash = PasswordHash.recommended()


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
