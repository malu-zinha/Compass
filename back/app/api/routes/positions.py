import logging
from math import ceil

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.errors import NotFound
from app.db.models import Position, User
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.positions import PositionIn, PositionOut
from app.services.storage import Storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/positions", tags=["positions"])


def _get_position(db: Session, position_id: int) -> Position:
    position = db.get(Position, position_id)
    if position is None:
        raise NotFound("Cargo não encontrado.")
    return position


@router.get("", response_model=Page[PositionOut])
def list_positions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[PositionOut]:
    query = db.query(Position).order_by(Position.id.desc())
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = ceil(total / per_page) if total else 0
    return Page(items=items, total=total, page=page, per_page=per_page, pages=pages)


@router.post("", response_model=PositionOut, status_code=201)
def create_position(
    payload: PositionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Position:
    position = Position(**payload.model_dump(), created_by_id=current_user.id)
    db.add(position)
    db.commit()
    db.refresh(position)
    logger.info("Cargo %s criado", position.id)
    return position


@router.get("/{position_id}", response_model=PositionOut)
def read_position(
    position_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Position:
    return _get_position(db, position_id)


@router.patch("/{position_id}", response_model=PositionOut)
def update_position(
    position_id: int,
    payload: PositionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Position:
    position = _get_position(db, position_id)
    for field, value in payload.model_dump().items():
        setattr(position, field, value)
    db.commit()
    db.refresh(position)
    logger.info("Cargo %s atualizado", position.id)
    return position


@router.delete("/{position_id}", status_code=204)
def delete_position(
    position_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    position = _get_position(db, position_id)
    names = [i.audio_filename for i in position.interviews if i.audio_filename]
    db.delete(position)
    db.commit()
    settings = request.app.state.settings
    storage: Storage = request.app.state.storage
    for name in names:
        storage.delete_file(settings.audio_dir, name)
    logger.info("Cargo %s excluído", position_id)
