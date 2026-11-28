"""The skills a student has (007 data-model.md): one row per profile and skill, in the shared `skills` vocabulary."""

import enum

from sqlalchemy import Enum, ForeignKey, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class SkillSource(enum.StrEnum):
    manual = "manual"  # typed or picked by the student
    cv = "cv"  # found in the CV by the extraction (US-17)


skill_source_enum = Enum(SkillSource, name="skill_source")


class StudentSkill(Base):
    """A skill of a student. `confirmed` is False until the student has reviewed it (US-18): matching and the profile
    analysis use confirmed skills only."""

    __tablename__ = "student_skills"

    profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), primary_key=True)
    source: Mapped[SkillSource] = mapped_column(skill_source_enum, nullable=False, default=SkillSource.manual)
    confirmed: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="true")
    position: Mapped[int] = mapped_column(SmallInteger, nullable=False)
