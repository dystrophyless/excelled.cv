import asyncio
import selectors
import sys

from src.auth import models as auth_models  # noqa: F401
from src.database import Base, async_engine
from src.users import models as user_models  # noqa: F401


async def create_tables() -> None:
    async with async_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    await async_engine.dispose()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.run(
            create_tables(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )
    else:
        asyncio.run(create_tables())
