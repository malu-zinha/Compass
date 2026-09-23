import logging
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.errors import Conflict, NotFound, PayloadTooLarge, Unprocessable
from app.core.signing import verify_signature
from app.db.models import User
from app.db.session import get_db
from app.schemas.users import UserOut, UserSettingsIn, UserSettingsOut, UserUpdate
from app.services.storage import Storage
from app.services.users import get_or_create_settings, user_out

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(request: Request, current_user: User = Depends(get_current_user)) -> UserOut:
    return user_out(current_user, request.app.state.settings)


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    new_email = data.get("email")
    if new_email is not None and new_email != current_user.email:
        exists = db.query(User).filter(User.email == new_email, User.id != current_user.id).first()
        if exists is not None:
            raise Conflict("E-mail já cadastrado.")
    for field, value in data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    logger.info("Usuário %s atualizado", current_user.id)
    return user_out(current_user, request.app.state.settings)


@router.post("/me/avatar", response_model=UserOut)
def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    settings = request.app.state.settings
    storage: Storage = request.app.state.storage
    max_bytes = settings.max_avatar_mb * 1024 * 1024 + 1024 * 1024
    content_length = request.headers.get("content-length")
    if content_length is not None and int(content_length) > max_bytes:
        raise PayloadTooLarge(f"O arquivo excede o limite de {settings.max_avatar_mb} MB.")
    previous_avatar = current_user.avatar_filename
    current_user.avatar_filename = storage.save_avatar(current_user.id, file)
    db.commit()
    db.refresh(current_user)
    storage.delete_file(settings.avatar_dir, previous_avatar)
    logger.info("Avatar do usuário %s atualizado", current_user.id)
    return user_out(current_user, settings)


@router.get("/me/settings", response_model=UserSettingsOut)
def read_settings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> UserSettingsOut:
    return get_or_create_settings(db, current_user)


@router.patch("/me/settings", response_model=UserSettingsOut)
def update_settings(
    payload: UserSettingsIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSettingsOut:
    settings_row = get_or_create_settings(db, current_user)
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    timezone = data.get("timezone")
    if timezone is not None:
        try:
            ZoneInfo(timezone)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise Unprocessable("Fuso horário inválido.") from exc
    for field, value in data.items():
        setattr(settings_row, field, value)
    db.commit()
    db.refresh(settings_row)
    return settings_row


@router.get("/{user_id}/avatar")
def get_avatar(
    user_id: int,
    expires: int,
    signature: str,
    request: Request,
    db: Session = Depends(get_db),
) -> FileResponse:
    settings = request.app.state.settings
    target = db.get(User, user_id)
    if target is None or not target.avatar_filename:
        raise NotFound("Foto de perfil não encontrada.")
    verify_signature(f"avatar:{target.id}:{target.avatar_filename}", expires, signature, settings)
    storage: Storage = request.app.state.storage
    path = storage.avatar_path(target.avatar_filename)
    if not path.exists():
        raise NotFound("Foto de perfil não encontrada.")
    return FileResponse(path)
