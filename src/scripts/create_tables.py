import argparse
import asyncio
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
