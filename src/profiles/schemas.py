"""Request / response bodies for the profiles API (contracts/profiles-api.md, research R6)."""

import re
from decimal import Decimal, InvalidOperation
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field, StringConstraints, ValidationInfo, field_validator

from src.catalog.enums import (
    ACCEPTED_FIELDS,
    DEGREE_MAX_YEAR,
    City,
    CompanySize,
    Degree,
    Industry,
    LanguageLevel,
    VacancyField,
    VacancyType,
)
from src.vacancies.schemas import UtcDatetime

# ---- reusable field types ----------------------------------------------------------------------


def _empty_to_none(value):
    """Optional text: trimmed; empty or whitespace-only becomes null."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def Required(min_length: int, max_length: int):  # noqa: N802 — reads like a type
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)]


def Optional(max_length: int):  # noqa: N802
    return Annotated[Annotated[str, StringConstraints(max_length=max_length)] | None, BeforeValidator(_empty_to_none)]


def _url(value: str | None) -> str | None:
    """http(s) URL with a host; a bare `kaspi.kz` gets `https://`."""
    if value is None:
        return None
    if not re.match(r"^[a-z][a-z0-9+.-]*://", value, re.IGNORECASE):
        value = f"https://{value}"
    parts = urlsplit(value)
    if parts.scheme.lower() not in ("http", "https") or not parts.hostname or "." not in parts.hostname or " " in value:
        raise ValueError("Enter a web address like example.com or https://example.com")
    return value


Url = Annotated[
    Annotated[str, StringConstraints(max_length=200)] | None, BeforeValidator(_empty_to_none), AfterValidator(_url)
]

_PHONE_RE = re.compile(r"^[0-9+\-() ]{7,20}$")


def _phone(value: str | None) -> str | None:
    if value is not None and (not _PHONE_RE.match(value) or not re.search(r"\d{5}", re.sub(r"\D", "", value))):
        raise ValueError("Enter a phone number, e.g. +7 701 123 45 67")
    return value


Phone = Annotated[str | None, BeforeValidator(_empty_to_none), AfterValidator(_phone)]


def _telegram(value: str | None) -> str | None:
    if value is None:
        return None
    handle = value.removeprefix("@")
    if not re.fullmatch(r"[A-Za-z0-9_]{5,32}", handle):
        raise ValueError("Enter a Telegram username, 5–32 letters, digits or _")
    return handle


Telegram = Annotated[str | None, BeforeValidator(_empty_to_none), AfterValidator(_telegram)]


def _gpa(value):
    """0.00–4.00 with at most two decimals; "3,45" is accepted."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    try:
        number = Decimal(str(value).strip().replace(",", "."))
    except InvalidOperation as error:
        raise ValueError("Enter a GPA from 0.00 to 4.00") from error
    if not (Decimal("0") <= number <= Decimal("4")) or number.as_tuple().exponent < -2:
        raise ValueError("Enter a GPA from 0.00 to 4.00, with at most two decimals")
    return number.quantize(Decimal("0.01"))


Gpa = Annotated[Decimal | None, BeforeValidator(_gpa)]


def _distinct(values: list) -> list:
    if len(set(values)) != len(values):
        raise ValueError("Each value can be chosen once")
    return values


def _accepted_fields(values: list[VacancyField]) -> list[VacancyField]:
    if any(value not in ACCEPTED_FIELDS for value in values):
        raise ValueError("This field of work is no longer offered")
    return values


# ---- student ----------------------------------------------------------------------------------


class Contacts(BaseModel):
    phone: Phone = None
    whatsapp: Phone = None
    telegram: Telegram = None
    linkedin_url: Url = None
    github_url: Url = None
    website_url: Url = None


class ProjectIn(BaseModel):
    title: Required(2, 80)
    description: Optional(300) = None
    url: Url = None


class LanguageIn(BaseModel):
    language: Required(2, 40)
    level: LanguageLevel


class StudentProfileIn(BaseModel):
    full_name: Required(2, 80)
    university: Required(2, 120)
    degree: Degree
    major: Required(2, 120)
    graduated: bool = False  # before study_year: its validator reads it
    study_year: int | None = Field(default=None, validate_default=True)
    gpa: Gpa = None
    looking_for_fields: Annotated[
        list[VacancyField], Field(max_length=3), AfterValidator(_distinct), AfterValidator(_accepted_fields)
    ] = Field(default_factory=list)
    position_types: Annotated[list[VacancyType], Field(min_length=1, max_length=3), AfterValidator(_distinct)]
    city: City | None = None
    about: Optional(1000) = None
    contacts: Contacts = Field(default_factory=Contacts)
    projects: list[ProjectIn] = Field(default_factory=list, max_length=10)
    languages: list[LanguageIn] = Field(default_factory=list, max_length=10)

    # Field validators (not model validators) so a 422 points at the field: loc ["body", "study_year"].
    @field_validator("study_year", mode="after")
    @classmethod
    def _year_fits_the_degree(cls, value: int | None, info: ValidationInfo) -> int | None:
        if info.data.get("graduated"):
            if value is not None:
                raise ValueError("Leave the year of study empty for a graduate")
            return None
        degree = info.data.get("degree")
        if degree is None:  # the degree itself failed; its own error is enough
            return value
        top = DEGREE_MAX_YEAR[degree]
        if value is None or not (1 <= value <= top):
            raise ValueError(f"Choose a year from 1 to {top}, or Graduated")
        return value

    @field_validator("languages", mode="after")
    @classmethod
    def _each_language_once(cls, value: list[LanguageIn]) -> list[LanguageIn]:
        seen = [language.language.casefold() for language in value]
        if len(set(seen)) != len(seen):
            raise ValueError("Each language can be listed once")
        return value


class StudentProfileUpdate(StudentProfileIn):
    version: int


class ProjectOut(BaseModel):
    title: str
    description: str | None
    url: str | None


class LanguageOut(BaseModel):
    language: str
    level: LanguageLevel


class StudentProfileOut(BaseModel):
    full_name: str
    university: str
    degree: Degree
    major: str
    study_year: int | None
    graduated: bool
    gpa: str | None  # "3.45"
    looking_for_fields: list[VacancyField]
    position_types: list[VacancyType]
    city: City | None
    about: str | None
    contacts: Contacts
    projects: list[ProjectOut]
    languages: list[LanguageOut]
    version: int
    created_at: UtcDatetime
    updated_at: UtcDatetime


# ---- company ----------------------------------------------------------------------------------


class CompanyProfileIn(BaseModel):
    name: Required(2, 120)
    industry: Industry
    size: CompanySize
    website: Url = None
    city: City | None = None
    description: Optional(1000) = None


class CompanyProfileUpdate(CompanyProfileIn):
    version: int


class CompanyProfileOut(BaseModel):
    name: str
    industry: Industry
    size: CompanySize
    website: str | None
    city: City | None
    description: str | None
    version: int
    created_at: UtcDatetime
    updated_at: UtcDatetime
