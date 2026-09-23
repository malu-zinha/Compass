from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import Unauthorized
from app.core.security import decode_access_token
from app.db.models import User
from app.db.session import get_db

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise Unauthorized("Faça login para continuar.")
    user = db.get(User, decode_access_token(creds.credentials, request.app.state.settings))
    if user is None:
        raise Unauthorized("Sessão inválida ou expirada. Faça login novamente.")
    return user


def authenticate_token(token: str, session_factory, settings) -> User:
    with session_factory() as db:
        user = db.get(User, decode_access_token(token, settings))
        if user is None:
            raise Unauthorized("Sessão inválida.")
        return user
