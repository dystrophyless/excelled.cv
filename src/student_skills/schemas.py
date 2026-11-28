from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from src.student_skills.models import SkillSource

MAX_SKILLS = 30

SkillName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class StudentSkillsIn(BaseModel):
    """The whole list the student ends up with. Saving it also confirms every skill in it."""

    skills: list[SkillName] = Field(max_length=MAX_SKILLS)


class StudentSkillOut(BaseModel):
    name: str
    source: SkillSource
    confirmed: bool


class StudentSkillsOut(BaseModel):
    skills: list[StudentSkillOut]
    max_skills: int = MAX_SKILLS


class ExtractedSkillsOut(StudentSkillsOut):
    """The result of reading the CV: the whole list, and which skills this run added for the student to review."""

    added: list[str]
    # More skills were found than the list can hold; the most mentioned ones were kept.
    truncated: bool = False
