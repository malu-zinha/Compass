from typing import Literal

from pydantic import BaseModel


class SpeakerRole(BaseModel):
    speaker: str  # "A", "B", ...
    role: Literal["interviewer", "candidate", "other"]


class QAPair(BaseModel):
    question: str
    answer: str


class Experience(BaseModel):
    company: str
    role: str
    description: str


class Subscores(BaseModel):
    technical: int
    communication: int
    work_culture: int
    experience: int


class Score(BaseModel):
    overall: int
    subscores: Subscores


class InterviewAnalysis(BaseModel):
    summary: str
    speaker_roles: list[SpeakerRole]
    qa_pairs: list[QAPair]
    skills: list[str]
    experiences: list[Experience]
    positives: list[str]
    negatives: list[str]
    ideal_profile_fit: str
    score: Score  # 0-1000, garantido por clamp_scores()
