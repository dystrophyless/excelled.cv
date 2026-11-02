from datetime import UTC, date, datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from src.catalog.enums import City, VacancyField, VacancyType, WorkFormat
from src.vacancies.models import ClosedBy, VacancyStatus

# The database hands timestamps back in the connection's zone; the API always speaks UTC.
UtcDatetime = Annotated[datetime, AfterValidator(lambda moment: moment.astimezone(UTC))]
SkillName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class VacancyInput(BaseModel):
    """Create / edit body. Everything but the title is optional so a draft can be saved at any point (research R7)."""

    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=120)]
    type: VacancyType | None = None
    field: VacancyField | None = None
    city: City | None = None
    format: WorkFormat | None = None
    description: str | None = Field(default=None, max_length=5000)
    duration: str | None = Field(default=None, max_length=60)
    salary: str | None = Field(default=None, max_length=60)
    apply_by: date | None = None
    required_skills: list[SkillName] = Field(default_factory=list, max_length=10)
    nice_skills: list[SkillName] = Field(default_factory=list, max_length=10)


class VacancyCreate(VacancyInput):
    publish: bool = False


class VacancyUpdate(VacancyInput):
    version: int


class StatusActionIn(BaseModel):
    action: Literal["publish", "pause", "resume", "close", "reopen"]
    version: int
    apply_by: date | None = None  # reopen only


class VacancyOut(BaseModel):
    id: int
    title: str
    type: VacancyType | None
    field: VacancyField | None
    city: City | None
    format: WorkFormat | None
    description: str | None
    duration: str | None
    salary: str | None
    apply_by: date | None
    closes_at: UtcDatetime | None
    required_skills: list[str]
    nice_skills: list[str]
    status: VacancyStatus
    published_at: UtcDatetime | None
    closed_at: UtcDatetime | None
    closed_by: ClosedBy | None
    # Zero until the applying feature exists (research R9); the contract is final now.
    applicants: int = 0
    new_applicants: int = 0
    version: int
    created_at: UtcDatetime
    updated_at: UtcDatetime


class Counts(BaseModel):
    all: int
    draft: int
    open: int
    paused: int
    closed: int


class VacancyListOut(BaseModel):
    items: list[VacancyOut]
    counts: Counts
