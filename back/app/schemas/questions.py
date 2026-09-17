from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class QuestionIn(BaseModel):
    text: NonEmptyStr
    position_id: int | None = None


class QuestionUpdate(BaseModel):
    text: NonEmptyStr


class QuestionOut(BaseModel):
    id: int
    text: str
    position_id: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
