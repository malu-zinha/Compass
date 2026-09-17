from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

EMAIL_PATTERN = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    email: str
    job_title: str
    phone: str
    company: str
    department: str
    avatar_url: str | None

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    name: str | None = None
    email: Annotated[str, Field(pattern=EMAIL_PATTERN, max_length=254)] | None = None
    job_title: str | None = None
    phone: str | None = None
    company: str | None = None
    department: str | None = None


class UserSettingsIn(BaseModel):
    suggest_questions: bool | None = None
    suggestion_interval_seconds: int | None = Field(None, ge=20, le=120)
    transcription_language: Literal["pt", "en", "es"] | None = None
    auto_save_notes: bool | None = None
    timezone: str | None = None
    date_format: Literal["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] | None = None


class UserSettingsOut(BaseModel):
    suggest_questions: bool
    suggestion_interval_seconds: int
    transcription_language: Literal["pt", "en", "es"]
    auto_save_notes: bool
    timezone: str
    date_format: Literal["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]

    model_config = ConfigDict(from_attributes=True)
