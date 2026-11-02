from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from src.users.models import UserRole

# Length is the only password rule (FR-002).
Password = Field(min_length=8, max_length=64)
Code = Field(pattern=r"^\d{6}$")


class AccountOut(BaseModel):
    id: int
    email: str
    role: UserRole


class AccountResponse(BaseModel):
    account: AccountOut


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Password
    role: UserRole


class ResendCodeRequest(BaseModel):
    email: EmailStr
    purpose: Literal["sign_up", "password_reset"]


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Code


class CodeSentResponse(BaseModel):
    resend_in: int
    expires_in: int


class RegisterResponse(CodeSentResponse):
    email: str


class PasswordResetRequestIn(BaseModel):
    email: EmailStr


class PasswordResetVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Code


class PasswordResetVerifyResponse(BaseModel):
    reset_token: str
    expires_in: int


class PasswordResetConfirmRequest(BaseModel):
    reset_token: str = Field(min_length=1, max_length=256)
    password: str = Password
