from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Skill(Base):
    """A skill name shared by vacancies now and by student profiles later; matching compares `key`."""

    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    key: Mapped[str] = mapped_column(String(40), unique=True, index=True)
