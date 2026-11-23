"""What a student sees of a vacancy (contracts/opportunities-api.md). Owner-only data has no field here (FR-017)."""

import enum
from datetime import date

from pydantic import BaseModel

from src.catalog.enums import City, CompanySize, Industry, VacancyField, VacancyType, WorkFormat
from src.vacancies.schemas import UtcDatetime


class OpportunityKind(enum.StrEnum):
    """The type filter; `vacancy` groups the two job types (research R4)."""

    internship = "internship"
    vacancy = "vacancy"
    research = "research"


class OpportunitySort(enum.StrEnum):
    newest = "newest"
    closing = "closing"


KIND_TYPES: dict[OpportunityKind, tuple[VacancyType, ...]] = {
    OpportunityKind.internship: (VacancyType.internship,),
    OpportunityKind.vacancy: (VacancyType.full_time, VacancyType.part_time),
    OpportunityKind.research: (VacancyType.research,),
}


class CompanyName(BaseModel):
    name: str


class CompanyOut(CompanyName):
    industry: Industry
    size: CompanySize
    city: City | None
    website: str | None
    description: str | None


class _Opportunity(BaseModel):
    id: int
    title: str
    type: VacancyType
    field: VacancyField
    city: City
    format: WorkFormat
    duration: str | None
    salary: str | None
    apply_by: date
    published_at: UtcDatetime
    required_skills: list[str]
    nice_skills: list[str]


class OpportunityItem(_Opportunity):
    company: CompanyName


class OpportunityOut(_Opportunity):
    description: str
    company: CompanyOut


class OpportunityListOut(BaseModel):
    items: list[OpportunityItem]
    total: int
    page: int
    page_size: int
