import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class NotFound(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(404, detail)


class Conflict(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(409, detail)


class Forbidden(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(403, detail)


class Unauthorized(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(401, detail)


class PayloadTooLarge(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(413, detail)


class UnsupportedMediaType(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(415, detail)


class Unprocessable(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(422, detail)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def _unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Erro não tratado em %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})
