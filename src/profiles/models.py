"""Student and company profiles (003 data-model.md). One profile per account, of the account's role."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.catalog.enums import (
    City,
    CompanySize,
    Degree,
    Industry,
    LanguageLevel,
    VacancyField,
    VacancyType,
    city_enum,
    company_size_enum,
    degree_enum,
    industry_enum,
    language_level_enum,
    vacancy_field_enum,
    vacancy_type_enum,
)
from src.database import Base

_NOW_UTC = text("TIMEZONE('utc', now())")


class _Timestamps:
    # Optimistic concurrency (research R1): every write is `WHERE version = :v` and bumps it.
    version: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=_NOW_UTC)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=_NOW_UTC, onupdate=_NOW_UTC
    )


class StudentProfile(_Timestamps, Base):
    __tablename__ = "student_profiles"
    __table_args__ = (
        CheckConstraint(
            "(graduated AND study_year IS NULL) OR (NOT graduated AND study_year IS NOT NULL)",
            name="ck_student_profiles_year_or_graduated",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    full_name: Mapped[str] = mapped_column(String(80))
    university: Mapped[str] = mapped_column(String(120))
    degree: Mapped[Degree] = mapped_column(degree_enum)
    major: Mapped[str] = mapped_column(String(120))
    study_year: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    graduated: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")
    gpa: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)

    looking_for_fields: Mapped[list[VacancyField]] = mapped_column(ARRAY(vacancy_field_enum), nullable=False)
    position_types: Mapped[list[VacancyType]] = mapped_column(ARRAY(vacancy_type_enum), nullable=False)

    city: Mapped[City | None] = mapped_column(city_enum, nullable=True)
    about: Mapped[str | None] = mapped_column(Text, nullable=True)

    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True)
    telegram: Mapped[str | None] = mapped_column(String(33), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(200), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(200), nullable=True)

    projects: Mapped[list["StudentProject"]] = relationship(
        order_by="StudentProject.position", cascade="all, delete-orphan", lazy="selectin"
    )
    languages: Mapped[list["StudentLanguage"]] = relationship(
        order_by="StudentLanguage.position", cascade="all, delete-orphan", lazy="selectin"
    )


class StudentProject(Base):
    __tablename__ = "student_projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(SmallInteger)
    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    url: Mapped[str | None] = mapped_column(String(200), nullable=True)


class StudentLanguage(Base):
    __tablename__ = "student_languages"
    __table_args__ = (
        Index("ux_student_languages_profile_language", "profile_id", func.lower(text("language")), unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(SmallInteger)
    language: Mapped[str] = mapped_column(String(40))
    level: Mapped[LanguageLevel] = mapped_column(language_level_enum)


class CompanyProfile(_Timestamps, Base):
    __tablename__ = "company_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    name: Mapped[str] = mapped_column(String(120))
    industry: Mapped[Industry] = mapped_column(industry_enum)
    size: Mapped[CompanySize] = mapped_column(company_size_enum)
    website: Mapped[str | None] = mapped_column(String(200), nullable=True)
    city: Mapped[City | None] = mapped_column(city_enum, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
