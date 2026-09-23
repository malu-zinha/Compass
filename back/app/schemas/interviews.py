from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.schemas.analysis import InterviewAnalysis

EMAIL_PATTERN = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"


class InterviewCreate(BaseModel):
    position_id: int
    candidate_name: str = Field(min_length=1, max_length=120)
    candidate_email: str = Field(pattern=EMAIL_PATTERN, max_length=254)
    candidate_phone: str = Field(min_length=1, max_length=40)
    mode: Literal["live", "upload"]
    recording_consent: bool
    notes: str = ""


class InterviewUpdate(BaseModel):
    candidate_name: str | None = Field(None, min_length=1, max_length=120)
    candidate_email: str | None = Field(None, pattern=EMAIL_PATTERN, max_length=254)
    candidate_phone: str | None = Field(None, min_length=1, max_length=40)
    notes: str | None = None


class InterviewSummary(BaseModel):
    id: int
    candidate_name: str
    candidate_email: str
    position_id: int
    position_name: str
    interviewer_name: str | None
    status: str
    score: int | None
    positives: list[str]
    negatives: list[str]
    audio_duration_seconds: float | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def _serialize_created_at(self, value: datetime) -> str:
        # O SQLite devolve datetimes sem fuso; eles são gravados em UTC.
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.isoformat()


class InterviewDetail(InterviewSummary):
    candidate_phone: str
    mode: str
    notes: str
    error_message: str | None
    recording_consent: bool
    has_audio: bool
    transcript: list[dict] | None
    analysis: InterviewAnalysis | None


class InterviewQuestionOut(BaseModel):
    id: int
    text: str
    source: Literal["registered", "ai"]
    based_on: str
    asked: bool
    asked_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class InterviewQuestionUpdate(BaseModel):
    asked: bool


class AudioUrlOut(BaseModel):
    url: str
    expires_at: int


class ReprocessIn(BaseModel):
    step: Literal["full", "analysis"]
