from pydantic import BaseModel

class PositionCreateRequest(BaseModel):
    position: str
    skills: list[str]
    description: str

class InterviewCreateRequest(BaseModel):
    name: str
    email: str
    number: str
    notes: str
    position_id: int
