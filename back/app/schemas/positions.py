from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PositionIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1)
    ideal_profile: str = ""
    skills: list[str] = Field(min_length=1)
    vacancies: int = Field(0, ge=0)


class PositionOut(BaseModel):
    id: int
    name: str
    description: str
    ideal_profile: str
    skills: list[str]
    vacancies: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
