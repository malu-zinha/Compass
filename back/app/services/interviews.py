import logging

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.errors import NotFound, Unprocessable
from app.db.models import (
    Interview,
    InterviewMode,
    InterviewQuestion,
    InterviewStatus,
    Position,
    Question,
    QuestionSource,
    User,
)
from app.schemas.analysis import InterviewAnalysis
from app.schemas.interviews import InterviewCreate, InterviewDetail, InterviewSummary
from app.services.storage import Storage
from app.services.users import get_or_create_settings

logger = logging.getLogger(__name__)


def get_interview_or_404(db: Session, interview_id: int) -> Interview:
    interview = db.get(Interview, interview_id)
    if interview is None:
        raise NotFound("Entrevista não encontrada.")
    return interview


def create_interview(db: Session, user: User, data: InterviewCreate) -> Interview:
    position = db.get(Position, data.position_id)
    if position is None:
        raise NotFound("Cargo não encontrado.")
    if not data.recording_consent:
        raise Unprocessable("É necessário o consentimento do candidato para gravar a entrevista.")

    language = get_or_create_settings(db, user).transcription_language
    interview = Interview(
        position_id=data.position_id,
        interviewer_id=user.id,
        candidate_name=data.candidate_name,
        candidate_email=data.candidate_email,
        candidate_phone=data.candidate_phone,
        mode=InterviewMode(data.mode),
        status=InterviewStatus.draft,
        language=language,
        recording_consent=data.recording_consent,
        notes=data.notes,
    )
    db.add(interview)
    db.flush()

    questions = (
        db.query(Question)
        .filter((Question.position_id.is_(None)) | (Question.position_id == data.position_id))
        .order_by(Question.id.asc())
        .all()
    )
    for question in questions:
        db.add(
            InterviewQuestion(
                interview_id=interview.id,
                text=question.text,
                source=QuestionSource.registered,
            )
        )

    db.commit()
    db.refresh(interview)
    return interview


def to_summary(interview: Interview) -> InterviewSummary:
    analysis = interview.analysis or {}
    positives = analysis.get("positives", []) if isinstance(analysis, dict) else []
    negatives = analysis.get("negatives", []) if isinstance(analysis, dict) else []
    return InterviewSummary(
        id=interview.id,
        candidate_name=interview.candidate_name,
        candidate_email=interview.candidate_email,
        position_id=interview.position_id,
        position_name=interview.position.name,
        interviewer_name=interview.interviewer.name if interview.interviewer else None,
        status=interview.status.value,
        score=interview.score,
        positives=positives,
        negatives=negatives,
        audio_duration_seconds=interview.audio_duration_seconds,
        created_at=interview.created_at,
    )


def to_detail(interview: Interview) -> InterviewDetail:
    summary = to_summary(interview)
    analysis = None
    if isinstance(interview.analysis, dict):
        try:
            analysis = InterviewAnalysis(**interview.analysis)
        except ValidationError:
            logger.warning("Análise inválida armazenada na entrevista %s", interview.id)
    return InterviewDetail(
        **summary.model_dump(),
        candidate_phone=interview.candidate_phone,
        mode=interview.mode.value,
        notes=interview.notes,
        error_message=interview.error_message,
        recording_consent=interview.recording_consent,
        has_audio=interview.audio_filename is not None,
        transcript=interview.transcript,
        analysis=analysis,
    )


def delete_interview(db: Session, storage: Storage, interview: Interview) -> None:
    interview_id = interview.id
    audio_filename = interview.audio_filename
    db.delete(interview)
    db.commit()
    storage.delete_interview_files(interview_id, audio_filename)
