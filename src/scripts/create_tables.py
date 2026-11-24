import argparse
import asyncio
import re
import selectors
import sys

from sqlalchemy import text

from src.auth import models as auth_models  # noqa: F401
from src.auth.models import (
    PasswordResetRequest,
    PendingUser,
    Session,
    SignInThrottle,
)
from src.database import Base, async_engine
from src.profiles import models as profile_models  # noqa: F401
from src.skills import models as skill_models  # noqa: F401
from src.users import models as user_models  # noqa: F401
from src.vacancies import models as vacancy_models  # noqa: F401
from src.vacancies.models import SALARY_CHECKS, SALARY_MAX
from src.users.models import User

AUTH_TABLES = [
    User.__table__,
    PendingUser.__table__,
    PasswordResetRequest.__table__,
    Session.__table__,
    SignInThrottle.__table__,
]


async def create_tables(*, reset_auth: bool = False) -> None:
    async with async_engine.begin() as connection:
        if reset_auth:
            # No migration tool yet (research R8): auth tables hold development data only.
            await connection.run_sync(
                lambda sync_connection: Base.metadata.drop_all(
                    sync_connection,
                    tables=AUTH_TABLES,
                )
            )
            await connection.execute(text("DROP TYPE IF EXISTS user_role"))

        await connection.run_sync(Base.metadata.create_all)

    await refine_vacancy_fields()
    await add_research_type()
    for vacancy_id, old_text in await upgrade_salary():
        print(f"vacancy {vacancy_id}: salary text {old_text!a} was not converted and stays in the old column")
    await async_engine.dispose()


NEW_FIELD_LABELS = ("data_analytics", "data_science", "data_engineering", "security")


async def refine_vacancy_fields() -> None:
    """003: `data` was split. Adds the new enum labels to an existing database and moves old rows to data_analytics.

    Idempotent. `ALTER TYPE … ADD VALUE` cannot run inside a transaction block, hence AUTOCOMMIT.
    """
    async with async_engine.connect() as connection:
        connection = await connection.execution_options(isolation_level="AUTOCOMMIT")
        for label in NEW_FIELD_LABELS:
            await connection.execute(text(f"ALTER TYPE vacancy_field ADD VALUE IF NOT EXISTS '{label}'"))
        await connection.execute(text("UPDATE vacancies SET field = 'data_analytics' WHERE field = 'data'"))


async def add_research_type() -> None:
    """004: the `research` vacancy type on an existing database. Idempotent; no row changes."""
    async with async_engine.connect() as connection:
        connection = await connection.execution_options(isolation_level="AUTOCOMMIT")
        await connection.execute(text("ALTER TYPE vacancy_type ADD VALUE IF NOT EXISTS 'research'"))


_SALARY_NOISE = re.compile(r"/\s*month|KZT|тг\.?|₸|\s", re.IGNORECASE)
_SALARY_AMOUNT = re.compile(r"\d{1,9}")


def plain_amount(old_text: str) -> int | None:
    """The amount in an old salary text such as "200 000 ₸ / month", or None when it is anything else."""
    digits = _SALARY_NOISE.sub("", old_text)
    if _SALARY_AMOUNT.fullmatch(digits) and 1 <= int(digits) <= SALARY_MAX:
        return int(digits)
    return None


async def upgrade_salary() -> list[tuple[int, str]]:
    """004 (research R12): the `currency` type, the amount columns and their checks; converts old text salaries.

    A plain amount goes to both amounts (tenge) and the text is cleared, so a second run cannot bring back a salary
    the employer removed. Other texts stay in the old, no longer mapped `salary` column; they are returned as
    (vacancy id, text). A database created after 0.5.0 has no such column. Idempotent; AUTOCOMMIT like the steps above.
    """
    async with async_engine.connect() as connection:
        connection = await connection.execution_options(isolation_level="AUTOCOMMIT")
        await connection.execute(
            text(
                "DO $$ BEGIN CREATE TYPE currency AS ENUM ('KZT', 'USD', 'EUR', 'RUB'); "
                "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
            )
        )
        await connection.execute(text("ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS salary_min integer"))
        await connection.execute(text("ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS salary_max integer"))
        await connection.execute(
            text("ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS salary_currency currency NOT NULL DEFAULT 'KZT'")
        )
        existing = set(
            (await connection.execute(text("SELECT conname FROM pg_constraint WHERE conrelid = 'vacancies'::regclass")))
            .scalars()
            .all()
        )
        for name, condition in SALARY_CHECKS.items():
            if name not in existing:
                await connection.execute(text(f"ALTER TABLE vacancies ADD CONSTRAINT {name} CHECK ({condition})"))

        has_text = await connection.scalar(
            text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = current_schema() AND table_name = 'vacancies' AND column_name = 'salary')"
            )
        )
        if not has_text:
            return []

        rows = (
            await connection.execute(
                text(
                    "SELECT id, salary FROM vacancies "
                    "WHERE salary IS NOT NULL AND salary_min IS NULL AND salary_max IS NULL ORDER BY id"
                )
            )
        ).all()
        unconverted = []
        for vacancy_id, old_text in rows:
            amount = plain_amount(old_text)
            if amount is None:
                unconverted.append((vacancy_id, old_text))
                continue
            await connection.execute(
                text(
                    "UPDATE vacancies SET salary_min = :amount, salary_max = :amount, salary_currency = 'KZT', "
                    "salary = NULL WHERE id = :id"
                ),
                {"amount": amount, "id": vacancy_id},
            )
        return unconverted


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the database tables.")
    parser.add_argument(
        "--reset-auth",
        action="store_true",
        help="drop and recreate users, pending_users, password_reset_requests, sessions, sign_in_throttles",
    )
    args = parser.parse_args()

    if sys.platform == "win32":
        asyncio.run(
            create_tables(reset_auth=args.reset_auth),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )
    else:
        asyncio.run(create_tables(reset_auth=args.reset_auth))


if __name__ == "__main__":
    main()
