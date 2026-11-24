from fastapi import APIRouter

from src.catalog.enums import (
    City,
    CompanySize,
    Currency,
    Industry,
    LanguageLevel,
    VacancyType,
    WorkFormat,
    currency_options,
    degree_options,
    field_options,
    options,
)

router = APIRouter()


@router.get("/catalog")
async def catalog():
    """The fixed lists the vacancy and profile forms use (public, cacheable)."""
    return {
        "types": options(VacancyType),
        "fields": field_options(),
        "cities": options(City),
        "formats": options(WorkFormat),
        "industries": options(Industry),
        "company_sizes": options(CompanySize),
        "degrees": degree_options(),
        "language_levels": options(LanguageLevel),
        "currencies": currency_options(),
    }
