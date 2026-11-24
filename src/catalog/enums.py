"""Fixed lists shared by validation and by the UI selects (002 research R6, 003 research R5).

Member name == value, so the Postgres enum labels equal the API values, except `CompanySize`, whose values start with a
digit (its enum stores the values, see `company_size_enum`). `LABELS` holds the display text.
"""

import enum

from sqlalchemy import Enum


class VacancyType(enum.StrEnum):
    internship = "internship"
    full_time = "full_time"
    part_time = "part_time"
    research = "research"


class WorkFormat(enum.StrEnum):
    on_site = "on_site"
    hybrid = "hybrid"
    remote = "remote"


class VacancyField(enum.StrEnum):
    backend = "backend"
    frontend = "frontend"
    mobile = "mobile"
    # 003 (owner, design round 14): "data" was too vague for students — split in three, plus security.
    # `data` stays a Postgres label (existing rows are migrated) but is no longer offered or accepted.
    data = "data"
    data_analytics = "data_analytics"
    data_science = "data_science"
    data_engineering = "data_engineering"
    qa = "qa"
    design = "design"
    devops = "devops"
    security = "security"
    product = "product"
    other = "other"


# The fields offered and accepted, in display order.
ACCEPTED_FIELDS: tuple[VacancyField, ...] = (
    VacancyField.backend,
    VacancyField.frontend,
    VacancyField.mobile,
    VacancyField.data_analytics,
    VacancyField.data_science,
    VacancyField.data_engineering,
    VacancyField.qa,
    VacancyField.design,
    VacancyField.devops,
    VacancyField.security,
    VacancyField.product,
    VacancyField.other,
)

# One line per field: what the role does, for students who don't know yet (003 ui-spec §1).
FIELD_DESCRIPTIONS: dict[VacancyField, str] = {
    VacancyField.backend: "Builds the server side: APIs, databases, business logic",
    VacancyField.frontend: "Builds the web pages and apps people see and click",
    VacancyField.mobile: "Builds apps for iPhone and Android",
    VacancyField.data_analytics: "Turns data into reports and dashboards that answer business questions",
    VacancyField.data_science: "Builds models that predict and recommend, including machine learning",
    VacancyField.data_engineering: "Builds the pipelines and storage that collect and clean data",
    VacancyField.qa: "Tests software and finds bugs before users do",
    VacancyField.design: "Designs screens and flows that are clear and easy to use",
    VacancyField.devops: "Keeps apps running: servers, cloud, releases, monitoring",
    VacancyField.security: "Protects systems and data from attacks and leaks",
    VacancyField.product: "Decides what to build and why, with users and the team",
    VacancyField.other: "Support, IT, business analysis and other roles",
}


class City(enum.StrEnum):
    almaty = "almaty"
    astana = "astana"
    shymkent = "shymkent"
    karaganda = "karaganda"
    aktobe = "aktobe"
    other = "other"


class Industry(enum.StrEnum):
    it = "it"
    finance = "finance"
    education = "education"
    healthcare = "healthcare"
    retail = "retail"
    manufacturing = "manufacturing"
    media = "media"
    government = "government"
    consulting = "consulting"
    other = "other"


class CompanySize(enum.StrEnum):
    s1_10 = "1_10"
    s11_50 = "11_50"
    s51_200 = "51_200"
    s201_1000 = "201_1000"
    s1000_plus = "1000_plus"


class Degree(enum.StrEnum):
    """Levels of Kazakhstan's education system (003 FR-002)."""

    college = "college"
    bachelor = "bachelor"
    master = "master"
    doctoral = "doctoral"
    residency = "residency"


DEGREE_MAX_YEAR: dict[Degree, int] = {
    Degree.college: 4,
    Degree.bachelor: 4,
    Degree.master: 2,
    Degree.doctoral: 3,
    Degree.residency: 4,
}


class LanguageLevel(enum.StrEnum):
    native = "native"
    fluent = "fluent"
    intermediate = "intermediate"
    basic = "basic"


class Currency(enum.StrEnum):
    """Salary currencies (004 research R12); tenge is the default."""

    KZT = "KZT"
    USD = "USD"
    EUR = "EUR"
    RUB = "RUB"


CURRENCY_SYMBOLS: dict[Currency, str] = {
    Currency.KZT: "₸",
    Currency.USD: "$",
    Currency.EUR: "€",
    Currency.RUB: "₽",
}


LABELS: dict[enum.StrEnum, str] = {
    VacancyType.internship: "Internship",
    VacancyType.full_time: "Full-time",
    VacancyType.part_time: "Part-time",
    VacancyType.research: "Research",
    WorkFormat.on_site: "On-site",
    WorkFormat.hybrid: "Hybrid",
    WorkFormat.remote: "Remote",
    VacancyField.backend: "Backend",
    VacancyField.frontend: "Frontend",
    VacancyField.mobile: "Mobile",
    VacancyField.data: "Data",
    VacancyField.data_analytics: "Data Analytics",
    VacancyField.data_science: "Data Science (incl. ML)",
    VacancyField.data_engineering: "Data Engineering",
    VacancyField.qa: "QA",
    VacancyField.design: "UI/UX Design",
    VacancyField.devops: "DevOps",
    VacancyField.security: "Cybersecurity",
    VacancyField.product: "Product",
    VacancyField.other: "Other",
    City.almaty: "Almaty",
    City.astana: "Astana",
    City.shymkent: "Shymkent",
    City.karaganda: "Karaganda",
    City.aktobe: "Aktobe",
    City.other: "Other",
    Industry.it: "IT & software",
    Industry.finance: "Finance & banking",
    Industry.education: "Education",
    Industry.healthcare: "Healthcare",
    Industry.retail: "Retail & e-commerce",
    Industry.manufacturing: "Manufacturing",
    Industry.media: "Media & marketing",
    Industry.government: "Government & public sector",
    Industry.consulting: "Consulting",
    Industry.other: "Other",
    CompanySize.s1_10: "1–10 employees",
    CompanySize.s11_50: "11–50 employees",
    CompanySize.s51_200: "51–200 employees",
    CompanySize.s201_1000: "201–1000 employees",
    CompanySize.s1000_plus: "1000+ employees",
    Degree.college: "College (TVE)",
    Degree.bachelor: "Bachelor's",
    Degree.master: "Master's",
    Degree.doctoral: "Doctoral (PhD)",
    Degree.residency: "Residency",
    LanguageLevel.native: "Native",
    LanguageLevel.fluent: "Fluent",
    LanguageLevel.intermediate: "Intermediate",
    LanguageLevel.basic: "Basic",
    Currency.KZT: "Tenge",
    Currency.USD: "US dollar",
    Currency.EUR: "Euro",
    Currency.RUB: "Russian ruble",
}


def options(enum_type: type[enum.StrEnum]) -> list[dict[str, str]]:
    return [{"value": member.value, "label": LABELS[member]} for member in enum_type]


def field_options() -> list[dict[str, str]]:
    return [
        {"value": field.value, "label": LABELS[field], "description": FIELD_DESCRIPTIONS[field]}
        for field in ACCEPTED_FIELDS
    ]


def currency_options() -> list[dict[str, str]]:
    return [{"value": c.value, "label": LABELS[c], "symbol": CURRENCY_SYMBOLS[c]} for c in Currency]


def degree_options() -> list[dict]:
    return [{"value": d.value, "label": LABELS[d], "max_year": DEGREE_MAX_YEAR[d]} for d in Degree]


def _values(enum_type):
    return [member.value for member in enum_type]


vacancy_type_enum = Enum(VacancyType, name="vacancy_type")
work_format_enum = Enum(WorkFormat, name="work_format")
vacancy_field_enum = Enum(VacancyField, name="vacancy_field")
city_enum = Enum(City, name="city")
industry_enum = Enum(Industry, name="industry")
company_size_enum = Enum(CompanySize, name="company_size", values_callable=_values)
degree_enum = Enum(Degree, name="degree")
language_level_enum = Enum(LanguageLevel, name="language_level")
currency_enum = Enum(Currency, name="currency")
