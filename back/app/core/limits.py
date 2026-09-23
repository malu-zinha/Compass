"""Middleware ASGI que rejeita corpos grandes antes de serem lidos."""

import json

from starlette.types import ASGIApp, Receive, Scope, Send


class MaxBodySizeMiddleware:
    """Barra a requisição pelo cabeçalho `content-length`, sem nunca chamar `receive`.

    O `File(...)` do FastAPI é resolvido durante a injeção de dependências: o Starlette
    já terminou de ler (e, no caso de multipart, gravar em disco) o corpo inteiro antes
    do handler da rota rodar. Isso significa que a checagem de tamanho feita dentro do
    handler roda tarde demais para evitar que um corpo gigante seja todo espalhado em
    disco. Este middleware roda antes disso, olhando só o cabeçalho.
    """

    def __init__(self, app: ASGIApp, max_upload_mb: int) -> None:
        self.app = app
        self.max_upload_mb = max_upload_mb
        self.max_bytes = max_upload_mb * 1024 * 1024 + 1024 * 1024

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        content_length = next(
            (value for key, value in scope.get("headers") or [] if key == b"content-length"), None
        )
        if content_length is not None:
            try:
                length = int(content_length)
            except ValueError:
                length = None
            if length is not None and length > self.max_bytes:
                detail = f"O arquivo excede o limite de {self.max_upload_mb} MB."
                body = json.dumps({"detail": detail}).encode()
                await send(
                    {
                        "type": "http.response.start",
                        "status": 413,
                        "headers": [(b"content-type", b"application/json")],
                    }
                )
                await send({"type": "http.response.body", "body": body})
                return
        await self.app(scope, receive, send)
