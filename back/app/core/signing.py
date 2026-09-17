import hashlib
import hmac
import time

from app.core.errors import Forbidden


def sign(resource: str, settings) -> tuple[int, str]:
    expires = int(time.time()) + settings.signed_url_ttl_seconds
    return expires, _digest(resource, expires, settings)


def verify_signature(resource: str, expires: int, signature: str, settings) -> None:
    if expires < time.time() or not hmac.compare_digest(signature, _digest(resource, expires, settings)):
        raise Forbidden("Link expirado ou inválido.")


def _digest(resource: str, expires: int, settings) -> str:
    key = settings.jwt_secret.get_secret_value().encode()
    return hmac.new(key, f"{resource}:{expires}".encode(), hashlib.sha256).hexdigest()
