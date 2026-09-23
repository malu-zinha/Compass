import asyncio
import json

from app.core.limits import MaxBodySizeMiddleware
from tests.helpers import create_interview


def test_oversized_content_length_is_rejected_before_body_is_read():
    """O corpo nunca deve ser lido, e a app interna (rota) nunca deve ser chamada."""
    inner_calls = []

    async def inner_app(scope, receive, send):
        inner_calls.append(scope)
        await receive()  # só chegaria aqui se o middleware deixasse passar

    middleware = MaxBodySizeMiddleware(inner_app, max_upload_mb=1, max_avatar_mb=1)
    scope = {"type": "http", "headers": [(b"content-length", str(3 * 1024 * 1024).encode())]}
    sent = []

    async def send(message):
        sent.append(message)

    async def receive():
        raise AssertionError("o corpo não deveria ser lido")

    asyncio.run(middleware(scope, receive, send))

    assert inner_calls == []
    assert sent[0]["status"] == 413
    assert json.loads(sent[1]["body"]) == {"detail": "O arquivo excede o limite de 1 MB."}


def test_content_length_within_limit_reaches_the_app():
    inner_calls = []

    async def inner_app(scope, receive, send):
        inner_calls.append(scope)
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    middleware = MaxBodySizeMiddleware(inner_app, max_upload_mb=1, max_avatar_mb=1)
    scope = {"type": "http", "headers": [(b"content-length", b"100")]}

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    sent = []

    async def send(message):
        sent.append(message)

    asyncio.run(middleware(scope, receive, send))

    assert len(inner_calls) == 1
    assert sent[0]["status"] == 200


def test_missing_content_length_reaches_the_app():
    inner_calls = []

    async def inner_app(scope, receive, send):
        inner_calls.append(scope)

    middleware = MaxBodySizeMiddleware(inner_app, max_upload_mb=1, max_avatar_mb=1)
    scope = {"type": "http", "headers": []}

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        pass

    asyncio.run(middleware(scope, receive, send))

    assert len(inner_calls) == 1


def test_middleware_rejects_real_oversized_upload(client):
    """Ponta a ponta: o app real recusa antes de gravar qualquer coisa em disco."""
    app = client.app
    huge = str(app.state.settings.max_upload_mb * 1024 * 1024 + 2 * 1024 * 1024)
    r = client.post(
        "/interviews/9999/audio",
        content=b"corpo pequeno",
        headers={"content-length": huge, "authorization": "Bearer x"},
    )
    assert r.status_code == 413


def test_avatar_upload_per_route_limit_rejected(auth_client, settings):
    """Requisição para avatar upload é rejeitada com o limite menor (max_avatar_mb)."""
    huge = str(settings.max_avatar_mb * 1024 * 1024 + 2 * 1024 * 1024)
    r = auth_client.post(
        "/users/me/avatar",
        content=b"corpo pequeno",
        headers={"content-length": huge},
    )
    assert r.status_code == 413
    assert not any(settings.avatar_dir.iterdir())


def test_audio_upload_not_rejected_by_small_avatar_limit(auth_client, settings, position_id):
    """Requisição para audio upload não é rejeitada pelo limite menor de avatar."""
    iid = create_interview(auth_client, position_id)
    huge = str(settings.max_avatar_mb * 1024 * 1024 + 2 * 1024 * 1024)
    r = auth_client.post(
        f"/interviews/{iid}/audio",
        content=b"corpo pequeno",
        headers={"content-length": huge},
    )
    assert r.status_code != 413
