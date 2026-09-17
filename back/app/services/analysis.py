import json
from dataclasses import dataclass

from openai import OpenAI

from app.schemas.analysis import InterviewAnalysis
from app.services.prompts import load_prompt
from app.services.transcription import Utterance


class AnalysisError(Exception):
    pass


@dataclass(frozen=True)
class AnalysisInput:
    position_name: str
    description: str
    skills: list[str]
    ideal_profile: str
    notes: str
    transcript: list[Utterance]

    @classmethod
    def from_interview(cls, interview) -> "AnalysisInput":
        if not interview.transcript:
            raise AnalysisError("A entrevista ainda não possui transcrição.")
        p = interview.position
        return cls(p.name, p.description, list(p.skills), p.ideal_profile, interview.notes,
                   [Utterance(**u) for u in interview.transcript])


def build_analysis_payload(data: AnalysisInput) -> str:
    return json.dumps({
        "position": {"name": data.position_name, "description": data.description,
                     "skills": data.skills, "ideal_profile": data.ideal_profile},
        "interviewer_notes": data.notes,
        "transcript": [u.to_dict() for u in data.transcript],
    }, ensure_ascii=False)


def _clamp(v: int) -> int:
    return max(0, min(1000, v))


def clamp_scores(a: InterviewAnalysis) -> InterviewAnalysis:
    s = a.score
    subs = s.subscores.model_copy(update={k: _clamp(v) for k, v in s.subscores.model_dump().items()})
    new_score = s.model_copy(update={"overall": _clamp(s.overall), "subscores": subs})
    return a.model_copy(update={"score": new_score})


class OpenAIAnalyzer:
    def __init__(self, settings, client=None):
        self.client = client or OpenAI(api_key=settings.openai_api_key.get_secret_value(),
                                        timeout=settings.openai_timeout_seconds)
        self.model = settings.openai_model

    def analyze(self, data: AnalysisInput) -> InterviewAnalysis:
        completion = self.client.chat.completions.parse(
            model=self.model, temperature=0.3, response_format=InterviewAnalysis,
            messages=[{"role": "system", "content": load_prompt("analysis")},
                      {"role": "user", "content": build_analysis_payload(data)}],
        )
        parsed = completion.choices[0].message.parsed
        if parsed is None:
            raise AnalysisError("A IA não retornou uma análise válida. Tente reanalisar.")
        return clamp_scores(parsed)
