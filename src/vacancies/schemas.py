from datetime import UTC, date, datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field, StrictInt, StringConstraints, ValidationInfo, field_validator

from src.catalog.enums import ACCEPTED_FIELDS, City, Currency, VacancyField, VacancyType, WorkFormat
from src.vacancies.models import SALARY_MAX, ClosedBy, VacancyStatus

# The database hands timestamps back in the connection's zone; the API always speaks UTC.
UtcDatetime = Annotated[datetime, AfterValidator(lambda moment: moment.astimezone(UTC))]
SkillName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


def _accepted_field(value: VacancyField | None) -> VacancyField | None:
    """`data` was split in 003 (data_analytics / data_science / data_engineering) and is no longer accepted."""
    if value is not None and value not in ACCEPTED_FIELDS:
        raise ValueError("This field of work is no longer offered; pick one of the current fields.")
    return value


AcceptedField = Annotated[VacancyField | None, AfterValidator(_accepted_field)]


SalaryAmount = Annotated[StrictInt, Field(ge=1, le=SALARY_MAX)]


class SalaryIn(BaseModel):
    """Monthly amounts and a currency. Whole numbers only: "100", 1.5 and true are refused, not converted."""

    min: SalaryAmount | None = None
    max: SalaryAmount | None = None
    currency: Currency = Currency.KZT

    @field_validator("max")
    @classmethod
    def _not_below_min(cls, value: int | None, info: ValidationInfo) -> int | None:
        low = info.data.get("min")
        if value is not None and low is not None and low > value:
            raise ValueError("The upper amount must not be lower than the lower one.")
        return value


class SalaryOut(BaseModel):
    min: int | None
    max: int | None
    currency: Currency


def salary_out(minimum: int | None, maximum: int | None, currency: Currency) -> SalaryOut | None:
    """The API form of the stored columns: null when there are no amounts."""
    if minimum is None and maximum is None:
        return None
    return SalaryOut(min=minimum, max=maximum, currency=currency)


class VacancyInput(BaseModel):
    """Create / edit body. Everything but the title is optional so a draft can be saved at any point (research R7)."""

    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=120)]
    type: VacancyType | None = None
    field: AcceptedField = None
    city: City | None = None
    format: WorkFormat | None = None
    description: str | None = Field(default=None, max_length=5000)
    duration: str | None = Field(default=None, max_length=60)
    salary: SalaryIn | None = None
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
    salary: SalaryOut | None
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
