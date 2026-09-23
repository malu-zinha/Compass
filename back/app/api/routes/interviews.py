import logging
import mimetypes
from math import ceil
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, contains_eager, joinedload

from app.api.deps import get_current_user
from app.core.errors import Conflict, Forbidden, NotFound, PayloadTooLarge, Unprocessable
from app.core.signing import sign, verify_signature
from app.db.base import utcnow
from app.db.models import PROCESSING_STATUSES, Interview, InterviewQuestion, InterviewStatus, Position, User
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.interviews import (
    AudioUrlOut,
    InterviewCreate,
    InterviewDetail,
    InterviewQuestionOut,
    InterviewQuestionUpdate,
    InterviewSummary,
    InterviewUpdate,
    ReprocessIn,
)
from app.services.interviews import (
    create_interview,
    delete_interview,
    get_interview_or_404,
    to_detail,
    to_summary,
)
from app.services.storage import Storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews", tags=["interviews"])


def _get_interview_question(db: Session, interview_id: int, question_id: int) -> InterviewQuestion:
    question = (
        db.query(InterviewQuestion).filter_by(id=question_id, interview_id=interview_id).first()
    )
    if question is None:
        raise NotFound("Pergunta não encontrada.")
    return question


@router.get("", response_model=Page[InterviewSummary])
def list_interviews(
    position_id: int | None = Query(None),
    status: list[str] | None = Query(None),
    sort: Literal["-created_at", "-score"] = "-created_at",
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[InterviewSummary]:
    base_query = db.query(Interview).join(Position, Interview.position_id == Position.id)
    if position_id is not None:
        base_query = base_query.filter(Interview.position_id == position_id)
    if status:
        base_query = base_query.filter(Interview.status.in_(status))

    total = base_query.count()

    if sort == "-score":
        order = (Interview.score.desc().nulls_last(), Interview.id.desc())
    else:
        order = (Interview.created_at.desc(), Interview.id.desc())

    items = (
        base_query.options(contains_eager(Interview.position), joinedload(Interview.interviewer))
        .order_by(*order)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    pages = ceil(total / per_page) if total else 0
    return Page(
        items=[to_summary(i) for i in items], total=total, page=page, per_page=per_page, pages=pages
    )


@router.post("", response_model=InterviewDetail, status_code=201)
def create_interview_route(
    payload: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewDetail:
    interview = create_interview(db, current_user, payload)
    logger.info("Entrevista %s criada", interview.id)
    return to_detail(interview)


@router.get("/{interview_id}", response_model=InterviewDetail)
def read_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewDetail:
    interview = get_interview_or_404(db, interview_id)
    return to_detail(interview)


@router.patch("/{interview_id}", response_model=InterviewDetail)
def update_interview(
    interview_id: int,
    payload: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewDetail:
    interview = get_interview_or_404(db, interview_id)
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in data.items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    logger.info("Entrevista %s atualizada", interview.id)
    return to_detail(interview)


@router.delete("/{interview_id}", status_code=204)
def remove_interview(
    interview_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    interview = get_interview_or_404(db, interview_id)
    storage: Storage = request.app.state.storage
    delete_interview(db, storage, interview)
    logger.info("Entrevista %s excluída", interview_id)


@router.post("/{interview_id}/audio", response_model=InterviewDetail, status_code=202)
def upload_audio(
    interview_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewDetail:
    interview = get_interview_or_404(db, interview_id)
    if interview.status == InterviewStatus.recording or interview.status in PROCESSING_STATUSES:
        raise Conflict("A entrevista já está sendo processada.")

    settings = request.app.state.settings
    storage: Storage = request.app.state.storage
    max_bytes = settings.max_upload_mb * 1024 * 1024 + 1024 * 1024
    content_length = request.headers.get("content-length")
    if content_length is not None and int(content_length) > max_bytes:
        raise PayloadTooLarge(f"O arquivo excede o limite de {settings.max_upload_mb} MB.")

    previous_audio = interview.audio_filename
    interview.audio_filename = storage.save_audio(interview.id, file)
    # Um novo áudio invalida qualquer resultado anterior (R25a).
    interview.transcript = None
    interview.analysis = None
    interview.score = None
    interview.error_message = None
    interview.audio_duration_seconds = None
    interview.status = InterviewStatus.uploaded
    db.commit()
    db.refresh(interview)
    storage.delete_file(settings.audio_dir, previous_audio)
    storage.pcm_path(interview.id).unlink(missing_ok=True)
    logger.info("Áudio da entrevista %s enviado", interview.id)
    background_tasks.add_task(request.app.state.pipeline.process, interview.id, "full")
    return to_detail(interview)


@router.get("/{interview_id}/audio-url", response_model=AudioUrlOut)
def get_audio_url(
    interview_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AudioUrlOut:
    interview = get_interview_or_404(db, interview_id)
    if not interview.audio_filename:
        raise NotFound("Esta entrevista não possui áudio.")
    settings = request.app.state.settings
    expires, signature = sign(f"audio:{interview.id}:{interview.audio_filename}", settings)
    url = f"/interviews/{interview_id}/audio?expires={expires}&signature={signature}"
    return AudioUrlOut(url=url, expires_at=expires)


@router.get("/{interview_id}/audio")
def get_audio(
    interview_id: int,
    expires: int,
    signature: str,
    request: Request,
    db: Session = Depends(get_db),
) -> FileResponse:
    settings = request.app.state.settings
    interview = db.get(Interview, interview_id)
    if interview is None or not interview.audio_filename:
        raise Forbidden("Link expirado ou inválido.")
    verify_signature(f"audio:{interview.id}:{interview.audio_filename}", expires, signature, settings)
    storage: Storage = request.app.state.storage
    path = storage.audio_path(interview.audio_filename)
    if not path.exists():
        raise Forbidden("Link expirado ou inválido.")
    media_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type)


@router.post("/{interview_id}/reprocess", response_model=InterviewDetail, status_code=202)
def reprocess_interview(
    interview_id: int,
    payload: ReprocessIn,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewDetail:
    interview = get_interview_or_404(db, interview_id)
    pipeline = request.app.state.pipeline
    already_processing = (
        interview.status == InterviewStatus.recording
        or interview.status in PROCESSING_STATUSES
        or pipeline.is_running(interview.id)
    )
    if already_processing:
        raise Conflict("A entrevista já está sendo processada.")
    if payload.step == "full" and not interview.audio_filename:
        raise Unprocessable("Esta entrevista não possui áudio para transcrever.")
    if payload.step == "analysis" and not interview.transcript:
        raise Unprocessable("Esta entrevista ainda não possui transcrição.")

    interview.status = InterviewStatus.uploaded if payload.step == "full" else InterviewStatus.analyzing
    interview.error_message = None
    db.commit()
    db.refresh(interview)
    logger.info("Entrevista %s marcada para reprocessamento (step=%s)", interview.id, payload.step)
    background_tasks.add_task(pipeline.process, interview.id, payload.step)
    return to_detail(interview)


@router.get("/{interview_id}/questions", response_model=list[InterviewQuestionOut])
def list_interview_questions(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InterviewQuestion]:
    interview = get_interview_or_404(db, interview_id)
    return interview.questions


@router.patch("/{interview_id}/questions/{question_id}", response_model=InterviewQuestionOut)
def mark_question_asked(
    interview_id: int,
    question_id: int,
    payload: InterviewQuestionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewQuestion:
    get_interview_or_404(db, interview_id)
    question = _get_interview_question(db, interview_id, question_id)
    question.asked = payload.asked
    question.asked_at = utcnow() if payload.asked else None
    db.commit()
    db.refresh(question)
    return question
