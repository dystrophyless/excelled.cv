from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import CurrentAccount, current_account
from src.database import get_session
from src.skills import repository

router = APIRouter()


@router.get("/skills")
async def skill_suggestions(
    _: Annotated[CurrentAccount, Depends(current_account)],
    db: Annotated[AsyncSession, Depends(get_session)],
    q: Annotated[str, Query(max_length=40)] = "",
):
    """Up to 10 existing skills for the skills combobox (any signed-in account)."""
    return {"skills": await repository.suggest(db, q)}
