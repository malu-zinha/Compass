import json
from types import SimpleNamespace

import pytest

from app.services.analysis import (
    AnalysisError,
    AnalysisInput,
    OpenAIAnalyzer,
    build_analysis_payload,
    clamp_scores,
)
from app.services.transcription import Utterance
from tests.fakes import make_analysis

DATA = AnalysisInput("Dev Python", "Backend", ["Python"], "Autônomo", "Chegou atrasado",
                     [Utterance("A", "Fale de você", 0, 1000)])


def test_payload_includes_ideal_profile_notes_and_transcript():
    body = json.loads(build_analysis_payload(DATA))
    assert body["position"]["ideal_profile"] == "Autônomo"
    assert body["interviewer_notes"] == "Chegou atrasado"
    assert body["transcript"][0] == {"speaker": "A", "text": "Fale de você", "start_ms": 0, "end_ms": 1000}


def test_clamp_scores():
    a = make_analysis(score=1500)
    a.score.subscores.technical = -5
    c = clamp_scores(a)
    assert c.score.overall == 1000 and c.score.subscores.technical == 0


def _client(parsed):
    message = SimpleNamespace(parsed=parsed)
    completion = SimpleNamespace(choices=[SimpleNamespace(message=message)])
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=lambda **kw: completion)))


def test_analyzer_returns_parsed(settings):
    assert OpenAIAnalyzer(settings, client=_client(make_analysis(700))).analyze(DATA).score.overall == 700


def test_analyzer_raises_when_model_refuses(settings):
    with pytest.raises(AnalysisError):
        OpenAIAnalyzer(settings, client=_client(None)).analyze(DATA)
