from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.config import settings


class Base(DeclarativeBase):
    pass


async_engine = create_async_engine(
    url=settings.database_url,
    pool_size=5,
    max_overflow=10,
)

SessionMaker = async_sessionmaker(
    bind=async_engine,
    # async sessions cannot lazy-load: keep attributes readable after commit
    expire_on_commit=False,
)


async def get_session():
    async with SessionMaker() as session:
        yield session
