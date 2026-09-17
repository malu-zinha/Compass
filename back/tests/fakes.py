import asyncio

from app.schemas.analysis import InterviewAnalysis, QAPair, Score, SpeakerRole, Subscores
from app.services.live.suggestions import SuggestedQuestion
from app.services.live.upstream import TurnEvent
from app.services.transcription import TranscriptionResult, Utterance


def make_analysis(score: int = 800) -> InterviewAnalysis:
    return InterviewAnalysis(
        summary="Resumo", qa_pairs=[QAPair(question="Fale de você", answer="Sou dev")],
        speaker_roles=[
            SpeakerRole(speaker="A", role="interviewer"),
            SpeakerRole(speaker="B", role="candidate"),
        ],
        skills=["Python"], experiences=[], positives=["Clareza"], negatives=["Pouca experiência"],
        ideal_profile_fit="Boa aderência",
        score=Score(
            overall=score,
            subscores=Subscores(technical=score, communication=score, work_culture=score, experience=score),
        ),
    )


class FakeTranscriber:
    def __init__(self, error: Exception | None = None, duration: float = 4.0):
        self.calls, self.error, self.duration = 0, error, duration

    def transcribe_file(self, path, language):
        self.calls += 1
        if self.error:
            raise self.error
        utterances = [Utterance("A", "Fale de você", 0, 1500), Utterance("B", "Sou dev", 1600, 4000)]
        return TranscriptionResult(utterances, self.duration)


class FakeAnalyzer:
    def __init__(self, score: int = 800, error: Exception | None = None):
        self.calls, self.score, self.error = 0, score, error

    def analyze(self, data):
        self.calls += 1
        if self.error:
            raise self.error
        return make_analysis(self.score)


class FakeStreaming:
    """Para cada chunk de áudio recebido, emite um turno parcial e depois um final."""

    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.closed = False
        self.count = 0

    async def send_audio(self, chunk):
        self.count += 1
        await self.queue.put(TurnEvent(self.count, "olá", False))
        await self.queue.put(TurnEvent(self.count, "Olá, tudo bem?", True))

    async def events(self):
        while True:
            yield await self.queue.get()

    async def close(self):
        self.closed = True


class FakeSuggester:
    def __init__(self, error: Exception | None = None):
        self.calls, self.error = [], error

    async def suggest(self, data):
        self.calls.append(data)
        if self.error:
            raise self.error
        return [SuggestedQuestion(text="Pode dar um exemplo?", kind="new", based_on="")]
