import asyncio
import logging
from contextlib import suppress

from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketDisconnect

from app.api.deps import authenticate_token
from app.core.errors import AppError, Unauthorized
from app.services.live.persistence import LIVE_STATUSES, get_interview_status, load_live_target
from app.services.live.session import LiveContext, run_live_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["live"])

AUTH_TIMEOUT_SECONDS = 5


async def _close(ws: WebSocket, code: int) -> None:
    with suppress(Exception):
        await ws.close(code=code)


@router.websocket("/interviews/{interview_id}/live")
async def live(ws: WebSocket, interview_id: int) -> None:
    state = ws.app.state
    await ws.accept()
    try:
        # O token chega na primeira mensagem (nunca na URL) para não aparecer em access logs.
        msg = await asyncio.wait_for(ws.receive_json(), timeout=AUTH_TIMEOUT_SECONDS)
        if not isinstance(msg, dict) or msg.get("type") != "auth" or not isinstance(msg.get("token"), str):
            raise Unauthorized("Sessão inválida.")
        user = await asyncio.to_thread(
            authenticate_token, msg["token"], state.session_factory, state.settings
        )
    except WebSocketDisconnect:
        return
    except (TimeoutError, AppError, ValueError, KeyError, TypeError):
        logger.info("WS ao vivo da entrevista %s: autenticação recusada", interview_id)
        await _close(ws, 4401)
        return

    target, user_settings = await asyncio.to_thread(load_live_target, state, interview_id, user.id)
    if target is None:
        await _close(ws, 4404)
        return
    if target.status not in LIVE_STATUSES:
        await _close(ws, 4409)
        return

    await state.live_registry.acquire(interview_id, ws)
    try:
        # A conexão anterior pode ter finalizado a gravação (stop) enquanto esta esperava no acquire.
        status = await asyncio.to_thread(get_interview_status, state, interview_id)
        if status not in LIVE_STATUSES:
            await _close(ws, 4404 if status is None else 4409)
            return
        logger.info("Sessão ao vivo da entrevista %s iniciada pelo usuário %s", interview_id, user.id)
        await run_live_session(ws, LiveContext(interview_id, target.language, user_settings, state))
    finally:
        state.live_registry.release(interview_id, ws)
