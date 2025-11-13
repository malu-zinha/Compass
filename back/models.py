from pydantic import BaseModel

class PositionCreateRequest(BaseModel):
    position: str
    skills: list[str]
    description: str
    vacancies: int = 0

class InterviewCreateRequest(BaseModel):
    name: str
    email: str
    number: str
    notes: str
    position_id: int

class QuestionCreateRequest(BaseModel):
    question: str
    interview_id: int

class NotesUpdateRequest(BaseModel):
    notes: str
