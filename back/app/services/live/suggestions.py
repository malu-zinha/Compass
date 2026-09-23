"""Sugestões de perguntas em tempo real (OpenAI, saída estruturada)."""

import json
from dataclasses import asdict, dataclass
from typing import Literal

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.services.prompts import load_prompt

MAX_SUGGESTIONS = 3
MAX_COMPLETION_TOKENS = 400
# Sugestões atrasadas perdem o sentido: limita o timeout mesmo que o da análise seja maior.
MAX_TIMEOUT_SECONDS = 30


class SuggestedQuestion(BaseModel):
    text: str
    kind: Literal["new", "adapted"]
    based_on: str


class SuggestionList(BaseModel):
    questions: list[SuggestedQuestion]


@dataclass(frozen=True)
class SuggestionInput:
    recent_turns: list[str]
    pending_registered: list[str]
    already_suggested: list[str]


def _key(text: str) -> str:
    return text.casefold().strip()


def dedupe(questions: list[SuggestedQuestion], existing: list[str]) -> list[SuggestedQuestion]:
    """Remove vazias, repetidas entre si e as que já existem (sem diferenciar caixa/espaços)."""
    seen = {_key(text) for text in existing}
    result = []
    for question in questions:
        key = _key(question.text)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(question.model_copy(update={"text": question.text.strip()}))
    return result


class OpenAISuggester:
    def __init__(self, settings, client=None):
        self.client = client or AsyncOpenAI(
            api_key=settings.openai_api_key.get_secret_value(),
            timeout=min(settings.openai_timeout_seconds, MAX_TIMEOUT_SECONDS),
        )
        self.model = settings.openai_model

    async def suggest(self, data: SuggestionInput) -> list[SuggestedQuestion]:
        completion = await self.client.chat.completions.parse(
            model=self.model, response_format=SuggestionList, max_completion_tokens=MAX_COMPLETION_TOKENS,
            messages=[{"role": "system", "content": load_prompt("suggestions")},
                      {"role": "user", "content": json.dumps(asdict(data), ensure_ascii=False)}],
        )
        parsed = completion.choices[0].message.parsed
        return [] if parsed is None else parsed.questions[:MAX_SUGGESTIONS]
