"""Employer vacancy API (contracts/vacancies-api.md). Every handler runs the deadline sweep first (research R1)."""

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import CurrentAccount, require_role
from src.auth.exceptions import api_error
from src.database import get_session
from src.vacancies import repository, rules
from src.vacancies.deadlines import closes_at_for, is_future_deadline, now_utc
from src.vacancies.models import ClosedBy, Vacancy, VacancyStatus
from src.vacancies.schemas import (
    StatusActionIn,
    VacancyCreate,
    VacancyInput,
    VacancyListOut,
    VacancyOut,
    VacancyUpdate,
)

router = APIRouter(prefix="/company/vacancies")

Employer = Annotated[CurrentAccount, Depends(require_role("employer"))]
Now = Annotated[datetime, Depends(now_utc)]


async def vacancy_db(
    _: Employer,
    db: Annotated[AsyncSession, Depends(get_session)],
    now: Now,
) -> AsyncSession:
    """The session, after the role check and after expired vacancies were closed."""
    await rules.sweep_expired(db, now)
    return db


Db = Annotated[AsyncSession, Depends(vacancy_db)]


# ---- errors ----------------------------------------------------------------------------------


def vacancy_not_found():
    """Same body for a missing vacancy and for someone else's (research R4, SC-006)."""
    return api_error(status.HTTP_404_NOT_FOUND, "vacancy_not_found", "Vacancy not found.")


def invalid_transition(current: VacancyStatus):
    return api_error(
        status.HTTP_409_CONFLICT,
        "invalid_transition",
        f"This vacancy is {current.value}, so that action is not available.",
        status=current.value,
    )


async def version_conflict(db: AsyncSession, vacancy: Vacancy):
    current = await repository.out_for(db, vacancy)
    return api_error(
        status.HTTP_409_CONFLICT,
        "version_conflict",
        "This vacancy was changed somewhere else. Reload it to see the latest version.",
        vacancy=current.model_dump(mode="json"),
    )


async def conflict_after_failed_write(db: AsyncSession, vacancy_id: int, employer_id: int, expected_version: int):
    """A versioned write matched nothing: the vacancy is gone, was changed meanwhile, or the status moved."""
    current = await repository.get_own(db, vacancy_id, employer_id)
    if current is None:
        return vacancy_not_found()
    if current.version != expected_version:
        return await version_conflict(db, current)
    return invalid_transition(current.status)


# ---- validation shared by create, edit and the status actions --------------------------------


def require_publishable(data: VacancyInput, now: datetime) -> None:
    """The vacancy must be complete and have a deadline that has not passed (research R7)."""
    required, _ = rules.resolve_skills(data.required_skills, data.nice_skills)
    missing = rules.missing_fields(
        title=data.title,
        type=data.type,
        field=data.field,
        city=data.city,
        format=data.format,
        description=data.description,
        apply_by=data.apply_by,
        required_skills=required,
    )
    if missing:
        raise api_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "incomplete",
            "Fill in the missing fields to publish.",
            fields=missing,
        )
    require_future_deadline(data.apply_by, now)


def require_future_deadline(apply_by, now: datetime) -> None:
    if apply_by is None or not is_future_deadline(apply_by, now):
        raise api_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "apply_by_not_in_future",
            "Choose today or a later date.",
        )


def content_values(data: VacancyInput) -> dict:
    """The columns an input controls (skills are stored separately)."""
    return {
        "title": data.title,
        "type": data.type,
        "field": data.field,
        "city": data.city,
        "format": data.format,
        "description": data.description,
        "duration": data.duration,
        "salary": data.salary,
        "apply_by": data.apply_by,
        "closes_at": closes_at_for(data.apply_by) if data.apply_by else None,
    }


# ---- list, create, read, edit ----------------------------------------------------------------


@router.get("", response_model=VacancyListOut)
async def list_vacancies(
    account: Employer,
    db: Db,
    status_filter: Annotated[Literal["all", "draft", "open", "paused", "closed"], Query(alias="status")] = "all",
    q: Annotated[str, Query(max_length=120)] = "",
):
    """The employer's own vacancies in one status group (newest change first) plus the counts of every group."""
    selected = None if status_filter == "all" else VacancyStatus(status_filter)
    return VacancyListOut(
        items=await repository.list_own(db, account.user.id, selected, q),
        counts=await repository.counts_own(db, account.user.id),
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=VacancyOut)
async def create_vacancy(data: VacancyCreate, account: Employer, db: Db, now: Now):
    if data.publish:
        require_publishable(data, now)

    vacancy = Vacancy(
        employer_id=account.user.id,
        status=VacancyStatus.open if data.publish else VacancyStatus.draft,
        published_at=now if data.publish else None,
        **content_values(data),
    )
    db.add(vacancy)
    await db.flush()
    required, nice = rules.resolve_skills(data.required_skills, data.nice_skills)
    await repository.set_skills(db, vacancy.id, required, nice)
    await db.commit()
    await db.refresh(vacancy)
    return repository.to_out(vacancy, required, nice)


@router.get("/{vacancy_id}", response_model=VacancyOut)
async def get_vacancy(vacancy_id: int, account: Employer, db: Db):
    vacancy = await repository.get_own(db, vacancy_id, account.user.id)
    if vacancy is None:
        raise vacancy_not_found()
    return await repository.out_for(db, vacancy)


@router.put("/{vacancy_id}", response_model=VacancyOut)
async def update_vacancy(vacancy_id: int, data: VacancyUpdate, account: Employer, db: Db, now: Now):
    vacancy = await repository.get_own(db, vacancy_id, account.user.id)
    if vacancy is None:
        raise vacancy_not_found()

    # A published vacancy must stay complete with a deadline that has not passed; drafts and closed ones are free.
    if vacancy.status in (VacancyStatus.open, VacancyStatus.paused):
        require_publishable(data, now)

    updated = await repository.update_versioned(
        db, vacancy_id, account.user.id, data.version, content_values(data)
    )
    if updated is None:
        raise await conflict_after_failed_write(db, vacancy_id, account.user.id, data.version)

    required, nice = rules.resolve_skills(data.required_skills, data.nice_skills)
    await repository.set_skills(db, vacancy_id, required, nice)
    await db.commit()
    return repository.to_out(updated, required, nice)


# ---- status actions --------------------------------------------------------------------------
# A "plan" is what the UPDATE writes plus extra WHERE conditions that keep the change atomic.

Plan = tuple[dict, tuple]


async def require_stored_publishable(vacancy: Vacancy, db: AsyncSession, now: datetime, apply_by=None) -> None:
    """The stored vacancy must be complete (with `apply_by` replacing the stored deadline when given)."""
    required, nice = (await repository.load_skills(db, [vacancy.id])).get(vacancy.id, ([], []))
    require_publishable(
        VacancyInput(
            title=vacancy.title,
            type=vacancy.type,
            field=vacancy.field,
            city=vacancy.city,
            format=vacancy.format,
            description=vacancy.description,
            apply_by=apply_by or vacancy.apply_by,
            required_skills=required,
            nice_skills=nice,
        ),
        now,
    )


async def prepare_publish(vacancy: Vacancy, data: StatusActionIn, db: AsyncSession, now: datetime) -> Plan:
    await require_stored_publishable(vacancy, db, now)
    return {"status": VacancyStatus.open, "published_at": vacancy.published_at or now}, ()


async def prepare_pause(vacancy: Vacancy, data: StatusActionIn, db: AsyncSession, now: datetime) -> Plan:
    return {"status": VacancyStatus.paused}, ()


async def prepare_resume(vacancy: Vacancy, data: StatusActionIn, db: AsyncSession, now: datetime) -> Plan:
    # Same deadline as before; a deadline that just passed means the vacancy is closed, not resumable.
    return {"status": VacancyStatus.open}, (Vacancy.closes_at > now,)


async def prepare_close(vacancy: Vacancy, data: StatusActionIn, db: AsyncSession, now: datetime) -> Plan:
    return {"status": VacancyStatus.closed, "closed_at": now, "closed_by": ClosedBy.employer}, ()


async def prepare_reopen(vacancy: Vacancy, data: StatusActionIn, db: AsyncSession, now: datetime) -> Plan:
    require_future_deadline(data.apply_by, now)
    await require_stored_publishable(vacancy, db, now, apply_by=data.apply_by)
    return {
        "status": VacancyStatus.open,
        "apply_by": data.apply_by,
        "closes_at": closes_at_for(data.apply_by),
        "closed_at": None,
        "closed_by": None,
    }, ()


PREPARERS = {
    rules.Action.publish: prepare_publish,
    rules.Action.pause: prepare_pause,
    rules.Action.resume: prepare_resume,
    rules.Action.close: prepare_close,
    rules.Action.reopen: prepare_reopen,
}


@router.post("/{vacancy_id}/status", response_model=VacancyOut)
async def change_status(vacancy_id: int, data: StatusActionIn, account: Employer, db: Db, now: Now):
    action = rules.Action(data.action)
    vacancy = await repository.get_own(db, vacancy_id, account.user.id)
    if vacancy is None:
        raise vacancy_not_found()
    if not rules.can_apply(action, vacancy.status):
        raise invalid_transition(vacancy.status)

    values, extra_conditions = await PREPARERS[action](vacancy, data, db, now)

    # The allowed-from check is repeated inside the UPDATE so a concurrent change cannot slip through.
    updated = await repository.update_versioned(
        db,
        vacancy_id,
        account.user.id,
        data.version,
        values,
        Vacancy.status.in_(rules.ALLOWED_FROM[action]),
        *extra_conditions,
    )
    if updated is None:
        raise await conflict_after_failed_write(db, vacancy_id, account.user.id, data.version)

    await db.commit()
    return await repository.out_for(db, updated)


# ---- delete a draft --------------------------------------------------------------------------


@router.delete("/{vacancy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vacancy(vacancy_id: int, version: Annotated[int, Query()], account: Employer, db: Db):
    """Only a draft can go; anything that was published can only be closed (spec FR-007)."""
    vacancy = await repository.get_own(db, vacancy_id, account.user.id)
    if vacancy is None:
        raise vacancy_not_found()
    if vacancy.status != VacancyStatus.draft:
        raise api_error(
            status.HTTP_409_CONFLICT,
            "not_a_draft",
            f"This vacancy is {vacancy.status.value}. Only drafts can be deleted; close it instead.",
            status=vacancy.status.value,
        )
    if vacancy.version != version:
        raise await version_conflict(db, vacancy)

    result = await db.execute(
        delete(Vacancy).where(
            Vacancy.id == vacancy_id,
            Vacancy.employer_id == account.user.id,
            Vacancy.version == version,
            Vacancy.status == VacancyStatus.draft,
        )
    )
    if result.rowcount == 0:
        raise await conflict_after_failed_write(db, vacancy_id, account.user.id, version)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
