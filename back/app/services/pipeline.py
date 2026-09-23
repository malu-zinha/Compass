import logging
import threading
from typing import Literal

from app.db.models import PROCESSING_STATUSES, Interview, InterviewStatus
from app.services.analysis import AnalysisError, AnalysisInput
from app.services.transcription import TranscriptionError

logger = logging.getLogger(__name__)
GENERIC_ERROR = "Erro inesperado ao processar a entrevista. Tente novamente."


class Pipeline:
    def __init__(self, session_factory, storage, transcriber, analyzer):
        self.session_factory, self.storage = session_factory, storage
        self.transcriber, self.analyzer = transcriber, analyzer
        self._running: set[int] = set()
        self._lock = threading.Lock()

    def is_running(self, interview_id: int) -> bool:
        with self._lock:
            return interview_id in self._running

    def process(self, interview_id: int, step: Literal["full", "analysis"] = "full") -> None:
        with self._lock:
            if interview_id in self._running:
                return
            self._running.add(interview_id)
        try:
            self._run(interview_id, step)
        finally:
            with self._lock:
                self._running.discard(interview_id)

    def _run(self, interview_id: int, step: str) -> None:
        with self.session_factory() as db:
            interview = db.get(Interview, interview_id)
            if interview is None:
                return
            if interview.status not in PROCESSING_STATUSES:
                logger.info("Execução obsoleta ignorada para a entrevista %s", interview_id)
                return
            try:
                if step == "full":
                    self._status(db, interview, InterviewStatus.transcribing)
                    result = self.transcriber.transcribe_file(
                        self.storage.audio_path(interview.audio_filename), interview.language
                    )
                    interview.transcript = [u.to_dict() for u in result.utterances]
                    interview.audio_duration_seconds = (
                        result.duration_seconds or interview.audio_duration_seconds
                    )
                self._status(db, interview, InterviewStatus.analyzing)
                analysis = self.analyzer.analyze(AnalysisInput.from_interview(interview))
                interview.analysis = analysis.model_dump()
                interview.score = analysis.score.overall
                interview.error_message = None
                self._status(db, interview, InterviewStatus.done)
                logger.info("Entrevista %s processada (step=%s)", interview_id, step)
            except (TranscriptionError, AnalysisError) as exc:
                self._fail(db, interview, str(exc))
            except Exception:
                logger.exception("Falha inesperada ao processar entrevista %s", interview_id)
                self._fail(db, interview, GENERIC_ERROR)

    @staticmethod
    def _status(db, interview, status) -> None:
        interview.status = status
        db.commit()

    def _fail(self, db, interview, message: str) -> None:
        db.rollback()
        interview.status, interview.error_message = InterviewStatus.error, message[:500]
        db.commit()
