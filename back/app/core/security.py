from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.errors import Unauthorized

_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _hasher.verify(password, password_hash)


def create_access_token(user_id: int, settings) -> str:
    exp = datetime.now(UTC) + timedelta(minutes=settings.jwt_expires_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": exp}, settings.jwt_secret.get_secret_value(), algorithm="HS256"
    )


def decode_access_token(token: str, settings) -> int:
    try:
        payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=["HS256"])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise Unauthorized("Sessão inválida ou expirada. Faça login novamente.") from exc
