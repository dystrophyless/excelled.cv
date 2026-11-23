from fastapi import APIRouter

from src.catalog.enums import City, VacancyField, VacancyType, WorkFormat, options

router = APIRouter()


@router.get("/catalog")
async def catalog():
    """The fixed lists the vacancy forms and filters use (public, cacheable)."""
    return {
        "types": options(VacancyType),
        "fields": options(VacancyField),
        "cities": options(City),
        "formats": options(WorkFormat),
    }
