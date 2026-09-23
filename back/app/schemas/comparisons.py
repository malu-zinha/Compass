from pydantic import BaseModel, Field


class ComparisonRequest(BaseModel):
    interview_ids: list[int] = Field(min_length=2, max_length=3)


class ComparisonRank(BaseModel):
    interview_id: int
    rank: int
    rationale: str


class ComparisonResult(BaseModel):
    summary: str
    ranking: list[ComparisonRank]
