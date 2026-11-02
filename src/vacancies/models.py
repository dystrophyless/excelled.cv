import enum
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.catalog.enums import (
    City,
    VacancyField,
    VacancyType,
    WorkFormat,
    city_enum,
    vacancy_field_enum,
    vacancy_type_enum,
    work_format_enum,
)
from src.database import Base

_NOW_UTC = text("TIMEZONE('utc', now())")


class VacancyStatus(enum.StrEnum):
    draft = "draft"
    open = "open"
    paused = "paused"
    closed = "closed"


class ClosedBy(enum.StrEnum):
    employer = "employer"
    deadline = "deadline"


class SkillKind(enum.StrEnum):
    required = "required"
    nice = "nice"


vacancy_status_enum = Enum(VacancyStatus, name="vacancy_status")
closed_by_enum = Enum(ClosedBy, name="closed_by")
skill_kind_enum = Enum(SkillKind, name="skill_kind")


class Vacancy(Base):
    """A job or internship posted by one employer. The status lifecycle is in data-model.md / rules.py."""

    __tablename__ = "vacancies"
    __table_args__ = (
        Index("ix_vacancies_employer_status", "employer_id", "status"),
        Index("ix_vacancies_status_closes_at", "status", "closes_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    title: Mapped[str] = mapped_column(String(120))
    type: Mapped[VacancyType | None] = mapped_column(vacancy_type_enum, nullable=True)
    field: Mapped[VacancyField | None] = mapped_column(vacancy_field_enum, nullable=True)
    city: Mapped[City | None] = mapped_column(city_enum, nullable=True)
    format: Mapped[WorkFormat | None] = mapped_column(work_format_enum, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration: Mapped[str | None] = mapped_column(String(60), nullable=True)
    salary: Mapped[str | None] = mapped_column(String(60), nullable=True)

    apply_by: Mapped[date | None] = mapped_column(Date, nullable=True)
    # End of `apply_by` in Kazakhstan time (UTC+5), as UTC — the instant applications stop (research R1/R2).
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[VacancyStatus] = mapped_column(
        vacancy_status_enum,
        nullable=False,
        default=VacancyStatus.draft,
        server_default=VacancyStatus.draft.value,
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by: Mapped[ClosedBy | None] = mapped_column(closed_by_enum, nullable=True)

    # Optimistic concurrency (research R3): every write is `WHERE version = :v` and bumps it.
    version: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=_NOW_UTC,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=_NOW_UTC,
        onupdate=_NOW_UTC,
    )


class VacancySkill(Base):
    """A skill on a vacancy, Required or Nice to have; a skill appears once per vacancy."""

    __tablename__ = "vacancy_skills"

    vacancy_id: Mapped[int] = mapped_column(
        ForeignKey("vacancies.id", ondelete="CASCADE"),
        primary_key=True,
    )
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), primary_key=True)
    kind: Mapped[SkillKind] = mapped_column(skill_kind_enum, nullable=False)
    position: Mapped[int] = mapped_column(nullable=False)
