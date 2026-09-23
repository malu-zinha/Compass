import json
from dataclasses import dataclass

from openai import OpenAI

from app.schemas.comparisons import ComparisonResult
from app.services.prompts import load_prompt


class ComparisonError(Exception):
    pass


@dataclass(frozen=True)
class ComparisonInput:
    position_name: str
    ideal_profile: str
    candidates: list[dict]


def build_comparison_payload(data: ComparisonInput) -> str:
    return json.dumps({
        "position_name": data.position_name,
        "ideal_profile": data.ideal_profile,
        "candidates": data.candidates,
    }, ensure_ascii=False)


class OpenAIComparator:
    def __init__(self, settings, client=None):
        self.client = client or OpenAI(api_key=settings.openai_api_key.get_secret_value(),
                                        timeout=settings.openai_timeout_seconds)
        self.model = settings.openai_model

    def compare(self, data: ComparisonInput) -> ComparisonResult:
        completion = self.client.chat.completions.parse(
            model=self.model, temperature=0.3, response_format=ComparisonResult,
            messages=[{"role": "system", "content": load_prompt("comparison")},
                      {"role": "user", "content": build_comparison_payload(data)}],
        )
        parsed = completion.choices[0].message.parsed
        if parsed is None:
            raise ComparisonError("A IA não retornou uma comparação válida. Tente novamente.")
        return parsed
