import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.errors import NotFound
from app.db.models import Position, Question, User
from app.db.session import get_db
from app.schemas.questions import QuestionIn, QuestionOut, QuestionUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/questions", tags=["questions"])


def _get_question(db: Session, question_id: int) -> Question:
    question = db.get(Question, question_id)
    if question is None:
        raise NotFound("Pergunta não encontrada.")
    return question


@router.get("", response_model=list[QuestionOut])
def list_questions(
    position_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Question]:
    query = db.query(Question).filter(Question.position_id == position_id)
    return query.order_by(Question.id.desc()).all()


@router.post("", response_model=QuestionOut, status_code=201)
def create_question(
    payload: QuestionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Question:
    if payload.position_id is not None and db.get(Position, payload.position_id) is None:
        raise NotFound("Cargo não encontrado.")
    question = Question(text=payload.text, position_id=payload.position_id, created_by_id=current_user.id)
    db.add(question)
    db.commit()
    db.refresh(question)
    logger.info("Pergunta %s criada", question.id)
    return question


@router.patch("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Question:
    question = _get_question(db, question_id)
    question.text = payload.text
    db.commit()
    db.refresh(question)
    logger.info("Pergunta %s atualizada", question.id)
    return question


@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    question = _get_question(db, question_id)
    db.delete(question)
    db.commit()
    logger.info("Pergunta %s excluída", question_id)
