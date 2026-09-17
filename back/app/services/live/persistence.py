"""Acesso ao banco da sessão ao vivo. Tudo síncrono: chamar via `asyncio.to_thread`."""

import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.db.models import Interview, InterviewQuestion, InterviewStatus, QuestionSource, User
from app.schemas.interviews import InterviewQuestionOut
from app.services.live.recorder import finalize_wav
from app.services.live.suggestions import SuggestedQuestion, SuggestionInput
from app.services.users import get_or_create_settings

logger = logging.getLogger(__name__)

LIVE_STATUSES = (InterviewStatus.draft, InterviewStatus.recording)
NO_AUDIO_MESSAGE = "Nenhum áudio foi gravado."


@dataclass(frozen=True)
class LiveTarget:
    status: InterviewStatus
    language: str


@dataclass(frozen=True)
class LiveUserSettings:
    suggest_questions: bool
    suggestion_interval_seconds: int


def load_live_target(
    state, interview_id: int, user_id: int
) -> tuple[LiveTarget | None, LiveUserSettings | None]:
    """Snapshot da entrevista (status original) e das configurações; marca `recording` se permitido."""
    with state.session_factory() as db:
        interview = db.get(Interview, interview_id)
        user = db.get(User, user_id)
        if interview is None or user is None:
            return None, None
        user_settings = get_or_create_settings(db, user)
        target = LiveTarget(interview.status, interview.language)
        snapshot = LiveUserSettings(
            user_settings.suggest_questions, user_settings.suggestion_interval_seconds
        )
        if interview.status in LIVE_STATUSES:
            interview.status = InterviewStatus.recording
            if interview.interviewer_id is None:
                interview.interviewer_id = user.id
            db.commit()
        return target, snapshot


def build_suggestion_input(state, interview_id: int, recent: list[str]) -> SuggestionInput:
    with state.session_factory() as db:
        questions = (
            db.query(InterviewQuestion)
            .filter(InterviewQuestion.interview_id == interview_id)
            .order_by(InterviewQuestion.id.asc())
            .all()
        )
        pending = [q.text for q in questions if q.source == QuestionSource.registered and not q.asked]
        suggested = [q.text for q in questions if q.source == QuestionSource.ai]
    return SuggestionInput(recent_turns=recent, pending_registered=pending, already_suggested=suggested)


def save_ai_questions(
    state, interview_id: int, questions: list[SuggestedQuestion]
) -> list[InterviewQuestionOut]:
    if not questions:
        return []
    with state.session_factory() as db:
        if db.get(Interview, interview_id) is None:  # excluída durante a sessão
            return []
        rows = [
            InterviewQuestion(interview_id=interview_id, text=q.text, source=QuestionSource.ai,
                              based_on=q.based_on, asked=False, asked_at=None)
            for q in questions
        ]
        db.add_all(rows)
        db.commit()
        return [InterviewQuestionOut.model_validate(row) for row in rows]


def finalize_interview_recording(db: Session, storage, interview: Interview) -> bool:
    """Gera o WAV do `.pcm` e marca `uploaded`. Sem áudio, marca `error`. Devolve se há áudio."""
    pcm = storage.pcm_path(interview.id)
    size = pcm.stat().st_size if pcm.exists() else 0
    if size == 0:
        pcm.unlink(missing_ok=True)
        interview.status, interview.error_message = InterviewStatus.error, NO_AUDIO_MESSAGE
        db.commit()
        logger.info("Entrevista %s encerrada sem áudio gravado", interview.id)
        return False
    name = f"interview_{interview.id}.wav"
    duration = finalize_wav(pcm, storage.audio_path(name))
    interview.audio_filename, interview.audio_duration_seconds = name, duration
    interview.status, interview.error_message = InterviewStatus.uploaded, None
    db.commit()
    logger.info("Gravação da entrevista %s finalizada (%s bytes, %.1fs)", interview.id, size, duration)
    return True


def finalize_recording(state, interview_id: int) -> bool:
    with state.session_factory() as db:
        interview = db.get(Interview, interview_id)
        if interview is None:
            state.storage.pcm_path(interview_id).unlink(missing_ok=True)
            return False
        return finalize_interview_recording(db, state.storage, interview)
