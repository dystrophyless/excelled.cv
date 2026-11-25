import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, field_validator

from src.cv.models import MAX_BYTES, CvFormat


class CvOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    file_name: str
    format: CvFormat
    size_bytes: int
    uploaded_at: datetime

    @field_validator("uploaded_at")
    @classmethod
    def _utc(cls, value: datetime) -> datetime:
        # The database hands back the connection's time zone; the API always speaks UTC.
        return value.astimezone(UTC)


class CvLimits(BaseModel):
    formats: list[CvFormat] = list(CvFormat)
    max_bytes: int = MAX_BYTES


class CvStateOut(BaseModel):
    cv: CvOut | None
    limits: CvLimits = CvLimits()
