import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, text
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class UserRole(enum.StrEnum):
    student = "student"
    employer = "employer"


user_role_enum = Enum(UserRole, name="user_role")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password: Mapped[str]
    role: Mapped[UserRole] = mapped_column(user_role_enum, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("TIMEZONE('utc', now())"),
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
