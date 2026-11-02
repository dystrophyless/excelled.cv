from datetime import UTC, date, datetime, timedelta

import pytest

from src.catalog.enums import City, VacancyField, VacancyType, WorkFormat
from src.vacancies import repository, rules
from src.vacancies.deadlines import closes_at_for
from src.vacancies.models import ClosedBy, Vacancy, VacancyStatus


@pytest.fixture
def make_vacancy(db):
    """Inserts a vacancy straight into the database. `owner` is an Account fixture or a User."""

    async def _make(
        owner,
        *,
        title: str = "Backend Intern (Python)",
        status: VacancyStatus = VacancyStatus.draft,
        complete: bool = True,
        apply_by: date | None = None,
        required: list[str] | None = None,
        nice: list[str] | None = None,
        **overrides,
    ) -> Vacancy:
        user = getattr(owner, "user", owner)
        values: dict = {"employer_id": user.id, "title": title, "status": status}
        if complete:
            if apply_by is None:
                apply_by = (datetime.now(UTC) + timedelta(days=14)).date()
            values |= {
                "type": VacancyType.internship,
                "field": VacancyField.backend,
                "city": City.almaty,
                "format": WorkFormat.hybrid,
                "description": "Join the Payments team.",
                "apply_by": apply_by,
                "closes_at": closes_at_for(apply_by),
            }
        elif apply_by is not None:
            values |= {"apply_by": apply_by, "closes_at": closes_at_for(apply_by)}
        if status != VacancyStatus.draft:
            values["published_at"] = datetime.now(UTC) - timedelta(days=1)
        if status == VacancyStatus.closed:
            values |= {"closed_at": datetime.now(UTC), "closed_by": ClosedBy.employer}
        values |= overrides

        vacancy = Vacancy(**values)
        db.add(vacancy)
        await db.flush()
        required_names, nice_names = rules.resolve_skills(
            ["Python", "SQL"] if required is None and complete else (required or []),
            nice or [],
        )
        await repository.set_skills(db, vacancy.id, required_names, nice_names)
        await db.commit()
        await db.refresh(vacancy)
        return vacancy

    return _make
