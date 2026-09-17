"""Orquestração da sessão ao vivo: grava o PCM, repassa ao streaming e gera sugestões."""

import asyncio
import json
import logging
import time
from contextlib import suppress
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket

from app.core.maintenance import schedule
from app.services.live.persistence import (
    LiveUserSettings,
    build_suggestion_input,
    finalize_recording,
    save_ai_questions,
)
from app.services.live.recorder import PcmRecorder
from app.services.live.suggestions import dedupe

__all__ = ["LiveContext", "finalize_recording", "run_live_session"]

logger = logging.getLogger(__name__)

WINDOW_MS = 60_000
CONNECT_TIMEOUT_SECONDS = 10
SEND_TIMEOUT_SECONDS = 5
CLOSE_TIMEOUT_SECONDS = 5
UNAVAILABLE_MESSAGE = "Transcrição ao vivo indisponível. O áudio continua sendo gravado."
INTERRUPTED_MESSAGE = "Transcrição ao vivo interrompida. O áudio continua sendo gravado."


@dataclass(frozen=True)
class LiveContext:
    interview_id: int
    language: str
    user_settings: LiveUserSettings
    state: Any

    @property
    def suggest_questions(self) -> bool:
        return self.user_settings.suggest_questions

    @property
    def suggestion_interval_seconds(self) -> int:
        return self.user_settings.suggestion_interval_seconds


def _is_stop(text: str) -> bool:
    with suppress(ValueError):
        payload = json.loads(text)
        return isinstance(payload, dict) and payload.get("type") == "stop"
    return False


async def _shutdown(iid: int, tasks: list[asyncio.Task], upstream) -> None:
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.wait(tasks, timeout=CLOSE_TIMEOUT_SECONDS)
    if upstream is not None:
        try:
            await asyncio.wait_for(upstream.close(), timeout=CLOSE_TIMEOUT_SECONDS)
        except Exception:
            logger.warning("Falha ao encerrar o streaming da entrevista %s", iid)


async def run_live_session(ws: WebSocket, ctx: LiveContext) -> None:
    state, iid = ctx.state, ctx.interview_id
    recorder = PcmRecorder(state.storage.pcm_path(iid))
    recorder.open()
    started = time.monotonic()
    final_turns: list[tuple[int, str]] = []  # (elapsed_ms, texto)
    stop_requested = asyncio.Event()
    upstream_lost = asyncio.Event()
    upstream = None
    tasks: list[asyncio.Task] = []

    async def send(payload: dict) -> None:
        with suppress(Exception):  # o cliente pode já ter saído; quem encerra a sessão é from_client
            await ws.send_json(payload)

    async def lose_upstream() -> None:
        if not upstream_lost.is_set():
            upstream_lost.set()
            logger.warning("Streaming interrompido na entrevista %s", iid)
            await send({"type": "error", "message": INTERRUPTED_MESSAGE})

    async def from_client() -> None:
        while True:
            message = await ws.receive()
            if message["type"] == "websocket.disconnect":
                return
            if message.get("bytes") is not None:
                recorder.append(message["bytes"])
                if upstream is not None and not upstream_lost.is_set():
                    try:
                        await asyncio.wait_for(upstream.send_audio(message["bytes"]), SEND_TIMEOUT_SECONDS)
                    except Exception:
                        await lose_upstream()
            elif message.get("text") and _is_stop(message["text"]):
                stop_requested.set()
                return

    async def from_upstream() -> None:
        if upstream is None:
            return
        with suppress(Exception):
            async for event in upstream.events():
                if event.is_final:
                    final_turns.append((int((time.monotonic() - started) * 1000), event.text))
                await send({"type": "transcript", "turn_id": event.turn_id,
                            "text": event.text, "is_final": event.is_final})
        await lose_upstream()  # o streaming acabou (ou falhou) com a sessão ainda aberta

    async def suggestions_loop() -> None:
        if not ctx.suggest_questions:
            return
        seen = 0
        while True:
            await asyncio.sleep(ctx.suggestion_interval_seconds)
            if len(final_turns) == seen:
                continue
            seen = len(final_turns)
            now_ms = int((time.monotonic() - started) * 1000)
            recent = [text for ms, text in final_turns if ms >= now_ms - WINDOW_MS]
            try:
                data = await asyncio.to_thread(build_suggestion_input, state, iid, recent)
                questions = dedupe(await state.suggester.suggest(data),
                                   data.already_suggested + data.pending_registered)
                saved = await asyncio.to_thread(save_ai_questions, state, iid, questions)
                if saved:
                    payload = [q.model_dump(mode="json") for q in saved]
                    await send({"type": "suggestions", "questions": payload})
            except Exception as exc:  # só o tipo: a mensagem pode conter texto da conversa
                logger.warning("Falha ao gerar sugestões para entrevista %s (%s)", iid, type(exc).__name__)

    try:
        await send({"type": "ready"})
        try:
            upstream = await asyncio.wait_for(state.streaming_factory(ctx.language), CONNECT_TIMEOUT_SECONDS)
        except Exception as exc:
            logger.warning("Streaming indisponível para entrevista %s (%s)", iid, type(exc).__name__)
            await send({"type": "error", "message": UNAVAILABLE_MESSAGE})
        client_task = asyncio.create_task(from_client())
        tasks = [client_task, asyncio.create_task(from_upstream()), asyncio.create_task(suggestions_loop())]
        await client_task  # a sessão termina quando o CLIENTE termina
    finally:
        for task in tasks:
            task.cancel()
        recorder.close()  # síncrono: nenhum append acontece depois do cancel
        # Terminate sempre enviado; protegido para concluir mesmo se esta corrotina for cancelada.
        cleanup = asyncio.create_task(_shutdown(iid, tasks, upstream))
        state.background.add(cleanup)
        cleanup.add_done_callback(state.background.discard)
        await asyncio.shield(cleanup)

    logger.info("Sessão ao vivo da entrevista %s encerrada (stop=%s, %s bytes, %.0fs)", iid,
                stop_requested.is_set(), recorder.bytes_written, time.monotonic() - started)
    if stop_requested.is_set():
        if await asyncio.to_thread(finalize_recording, state, iid):
            schedule(state, [(iid, "full")])  # antes do session_ended: o áudio já está na fila
        await send({"type": "session_ended"})
        with suppress(Exception):
            await ws.close()
