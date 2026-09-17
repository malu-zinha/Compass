import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.errors import Conflict, Unauthorized
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import LoginIn, RegisterIn, TokenOut
from app.schemas.users import UserOut
from app.services.users import get_or_create_settings, user_out

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: RegisterIn, request: Request, db: Session = Depends(get_db)) -> UserOut:
    exists = (
        db.query(User).filter(or_(User.username == payload.username, User.email == payload.email)).first()
    )
    if exists is not None:
        raise Conflict("Usuário ou e-mail já cadastrado.")
    user = User(
        name=payload.name,
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    get_or_create_settings(db, user)
    logger.info("Usuário %s registrado", user.id)
    return user_out(user, request.app.state.settings)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> TokenOut:
    user = db.query(User).filter(User.username == payload.username).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise Unauthorized("Usuário ou senha incorretos.")
    settings = request.app.state.settings
    token = create_access_token(user.id, settings)
    logger.info("Usuário %s autenticado", user.id)
    return TokenOut(access_token=token, user=user_out(user, settings))
