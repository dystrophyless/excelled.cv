"""Fixed lists shared by validation and by the UI selects (research R6).

Member name == value, so the Postgres enum labels equal the API values. `LABELS` holds the display text.
"""

import enum

from sqlalchemy import Enum


class VacancyType(enum.StrEnum):
    internship = "internship"
    full_time = "full_time"
    part_time = "part_time"


class WorkFormat(enum.StrEnum):
    on_site = "on_site"
    hybrid = "hybrid"
    remote = "remote"


class VacancyField(enum.StrEnum):
    backend = "backend"
    frontend = "frontend"
    mobile = "mobile"
    data = "data"
    qa = "qa"
    design = "design"
    devops = "devops"
    product = "product"
    other = "other"


class City(enum.StrEnum):
    almaty = "almaty"
    astana = "astana"
    shymkent = "shymkent"
    karaganda = "karaganda"
    aktobe = "aktobe"
    other = "other"


LABELS: dict[enum.StrEnum, str] = {
    VacancyType.internship: "Internship",
    VacancyType.full_time: "Full-time",
    VacancyType.part_time: "Part-time",
    WorkFormat.on_site: "On-site",
    WorkFormat.hybrid: "Hybrid",
    WorkFormat.remote: "Remote",
    VacancyField.backend: "Backend",
    VacancyField.frontend: "Frontend",
    VacancyField.mobile: "Mobile",
    VacancyField.data: "Data",
    VacancyField.qa: "QA",
    VacancyField.design: "Design",
    VacancyField.devops: "DevOps",
    VacancyField.product: "Product",
    VacancyField.other: "Other",
    City.almaty: "Almaty",
    City.astana: "Astana",
    City.shymkent: "Shymkent",
    City.karaganda: "Karaganda",
    City.aktobe: "Aktobe",
    City.other: "Other",
}


def options(enum_type: type[enum.StrEnum]) -> list[dict[str, str]]:
    return [{"value": member.value, "label": LABELS[member]} for member in enum_type]


vacancy_type_enum = Enum(VacancyType, name="vacancy_type")
work_format_enum = Enum(WorkFormat, name="work_format")
vacancy_field_enum = Enum(VacancyField, name="vacancy_field")
city_enum = Enum(City, name="city")
