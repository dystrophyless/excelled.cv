"""Student opportunities API (contracts/opportunities-api.md). Read-only; active vacancies only."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.exceptions import api_error
from src.catalog.enums import City, VacancyField, WorkFormat
from src.database import get_session
from src.opportunities import repository
from src.opportunities.schemas import OpportunityKind, OpportunityListOut, OpportunityOut, OpportunitySort
from src.profiles.dependencies import require_student_profile
from src.vacancies import rules
from src.vacancies.deadlines import now_utc

router = APIRouter(prefix="/student/opportunities")

Now = Annotated[datetime, Depends(now_utc)]


async def opportunity_db(
    _profile_id: Annotated[int, Depends(require_student_profile("Create your profile to see opportunities."))],
    db: Annotated[AsyncSession, Depends(get_session)],
    now: Now,
) -> AsyncSession:
    """The session, after the role check, the student-profile check (FR-001) and the deadline sweep."""
    await rules.sweep_expired(db, now)
    return db


Db = Annotated[AsyncSession, Depends(opportunity_db)]


@router.get("", response_model=OpportunityListOut)
async def list_opportunities(
    db: Db,
    now: Now,
    q: Annotated[str, Query(max_length=120)] = "",
    kind: Annotated[OpportunityKind | None, Query(alias="type")] = None,
    formats: Annotated[list[WorkFormat], Query(alias="format")] = [],
    cities: Annotated[list[City], Query(alias="city")] = [],
    fields: Annotated[list[VacancyField], Query(alias="field")] = [],
    sort: OpportunitySort = OpportunitySort.newest,
    page: Annotated[int, Query(ge=1)] = 1,
):
    filters = repository.Filters(q=q, kind=kind, formats=formats, cities=cities, fields=fields)
    return await repository.list_active(db, now, filters, sort, page)


@router.get("/{opportunity_id}", response_model=OpportunityOut)
async def get_opportunity(opportunity_id: int, db: Db, now: Now):
    opportunity = await repository.get_active(db, now, opportunity_id)
    if opportunity is None:
        # the same answer whatever the reason (FR-007)
        raise api_error(
            status.HTTP_404_NOT_FOUND, "opportunity_unavailable", "This opportunity is no longer available."
        )
    return opportunity
