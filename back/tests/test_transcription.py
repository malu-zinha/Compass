from types import SimpleNamespace

import pytest

from app.services import transcription as t


@pytest.mark.parametrize(
    "raw,expected", [(0, "A"), (1, "B"), ("b", "B"), (" c ", "C"), (None, "A"), ("", "A")]
)
def test_normalize_speaker(raw, expected):
    assert t.normalize_speaker(raw) == expected


def _fake_sdk(monkeypatch, result, captured):
    class FakeTranscriber:
        def __init__(self, config): captured["config"] = config
        def transcribe(self, path): return result
    monkeypatch.setattr(t.aai, "Transcriber", FakeTranscriber)


def test_maps_utterances_and_duration(monkeypatch, tmp_path):
    captured = {}
    result = SimpleNamespace(status=t.aai.TranscriptStatus.completed, error=None, audio_duration=12,
                             utterances=[SimpleNamespace(speaker=0, text="Olá", start=0, end=900)])
    _fake_sdk(monkeypatch, result, captured)
    out = t.AssemblyAITranscriber("k").transcribe_file(tmp_path / "a.mp3", "pt")
    assert out.utterances == [t.Utterance("A", "Olá", 0, 900)] and out.duration_seconds == 12.0
    assert captured["config"].speaker_labels is True and captured["config"].language_code == "pt"


@pytest.mark.parametrize("result", [
    SimpleNamespace(status="error", error="bad audio", audio_duration=None, utterances=None),
    SimpleNamespace(status="completed", error=None, audio_duration=3, utterances=[]),
])
def test_errors_raise_transcription_error(monkeypatch, tmp_path, result):
    if result.status == "error":
        result.status = t.aai.TranscriptStatus.error
    else:
        result.status = t.aai.TranscriptStatus.completed
    _fake_sdk(monkeypatch, result, {})
    with pytest.raises(t.TranscriptionError):
        t.AssemblyAITranscriber("k").transcribe_file(tmp_path / "a.mp3", "pt")
