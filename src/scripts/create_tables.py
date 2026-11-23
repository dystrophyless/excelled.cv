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

    await async_engine.dispose()


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
