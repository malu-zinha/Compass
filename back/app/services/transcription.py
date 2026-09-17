from dataclasses import asdict, dataclass
from pathlib import Path

import assemblyai as aai


class TranscriptionError(Exception):
    pass


@dataclass(frozen=True)
class Utterance:
    speaker: str
    text: str
    start_ms: int
    end_ms: int

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class TranscriptionResult:
    utterances: list[Utterance]
    duration_seconds: float | None


def normalize_speaker(raw) -> str:
    """Substitui os 4 blocos duplicados de interview_processing.py.

    (linhas 162-171, 505-512, 671-678, 874-880)
    """
    if raw is None or isinstance(raw, bool):
        return "A"
    if isinstance(raw, int | float):
        return chr(ord("A") + int(raw))
    return str(raw).strip().upper() or "A"


class AssemblyAITranscriber:
    def __init__(self, api_key: str):
        aai.settings.api_key = api_key

    def transcribe_file(self, path: Path, language: str) -> TranscriptionResult:
        config = aai.TranscriptionConfig(speaker_labels=True, speakers_expected=2, language_code=language)
        result = aai.Transcriber(config=config).transcribe(str(path))
        if result.status == aai.TranscriptStatus.error:
            raise TranscriptionError("Não foi possível transcrever o áudio.")
        utterances = [Utterance(normalize_speaker(u.speaker), u.text, int(u.start), int(u.end))
                      for u in (result.utterances or [])]
        if not utterances:
            raise TranscriptionError("Nenhuma fala foi detectada no áudio.")
        duration = float(result.audio_duration) if result.audio_duration else None
        return TranscriptionResult(utterances, duration)
