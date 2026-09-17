"""Garante uma única conexão ao vivo por entrevista."""

import asyncio
import logging
from contextlib import suppress

logger = logging.getLogger(__name__)

REPLACED_CLOSE_CODE = 4000
RELEASE_TIMEOUT_SECONDS = 5


class LiveRegistry:
    """Usado no event loop; `is_active` também é lido pela manutenção (thread), só como consulta."""

    def __init__(self):
        self._connections: dict[int, object] = {}
        self._released: dict[int, asyncio.Event] = {}

    def is_active(self, interview_id: int) -> bool:
        return interview_id in self._connections

    async def acquire(self, interview_id: int, websocket) -> None:
        while (old := self._connections.get(interview_id)) is not None:
            released = self._released[interview_id]
            with suppress(Exception):
                await old.close(code=REPLACED_CLOSE_CODE)
            try:
                await asyncio.wait_for(released.wait(), timeout=RELEASE_TIMEOUT_SECONDS)
            except TimeoutError:
                logger.warning("Conexão anterior da entrevista %s não liberou a tempo", interview_id)
                break
        self._connections[interview_id] = websocket
        self._released[interview_id] = asyncio.Event()

    def release(self, interview_id: int, websocket) -> None:
        if self._connections.get(interview_id) is websocket:
            del self._connections[interview_id]
            self._released.pop(interview_id).set()
