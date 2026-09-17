from pydantic import BaseModel, EmailStr, Field, SecretStr


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: SecretStr = Field(min_length=8, max_length=64)
