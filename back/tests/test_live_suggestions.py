import asyncio
import json
from types import SimpleNamespace

from app.services.live.suggestions import (
    OpenAISuggester,
    SuggestedQuestion,
    SuggestionInput,
    SuggestionList,
    dedupe,
)

DATA = SuggestionInput(recent_turns=["Trabalhei com Django"], pending_registered=["Fale de você"],
                       already_suggested=["Qual foi o maior desafio?"])


def _question(text: str) -> SuggestedQuestion:
    return SuggestedQuestion(text=text, kind="new", based_on="")


def _client(parsed, calls: list):
    completion = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(parsed=parsed))])

    async def parse(**kwargs):
        calls.append(kwargs)
        return completion

    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=parse)))


def test_suggester_uses_structured_output_and_limits_to_three(settings):
    calls = []
    parsed = SuggestionList(questions=[_question(f"P{n}") for n in range(5)])
    result = asyncio.run(OpenAISuggester(settings, client=_client(parsed, calls)).suggest(DATA))
    assert [q.text for q in result] == ["P0", "P1", "P2"]
    kwargs = calls[0]
    assert kwargs["response_format"] is SuggestionList and kwargs["max_completion_tokens"] == 400
    assert json.loads(kwargs["messages"][1]["content"]) == {
        "recent_turns": ["Trabalhei com Django"], "pending_registered": ["Fale de você"],
        "already_suggested": ["Qual foi o maior desafio?"]}


def test_suggester_returns_empty_when_model_refuses(settings):
    assert asyncio.run(OpenAISuggester(settings, client=_client(None, [])).suggest(DATA)) == []


def test_dedupe_ignores_case_spaces_and_repeats():
    questions = [_question(" Pode dar um exemplo? "), _question("Nova pergunta"), _question("nova PERGUNTA"),
                 _question("   ")]
    result = dedupe(questions, ["PODE DAR UM EXEMPLO?"])
    assert [q.text for q in result] == ["Nova pergunta"]
