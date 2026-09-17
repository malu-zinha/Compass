"""Adaptador do AssemblyAI Universal Streaming v3 (WebSocket)."""

import json
from collections.abc import AsyncIterator
from contextlib import suppress
from dataclasses import dataclass
from typing import Literal, Protocol
from urllib.parse import urlencode

import websockets

URL = "wss://streaming.assemblyai.com/v3/ws"


@dataclass(frozen=True)
class TurnEvent:
    turn_id: int
    text: str
    is_final: bool


class StreamingTranscriber(Protocol):
    async def send_audio(self, chunk: bytes) -> None: ...

    def events(self) -> AsyncIterator[TurnEvent]: ...

    async def close(self) -> None: ...


def parse_message(raw: str) -> TurnEvent | Literal["terminated"] | None:
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return None
    if not isinstance(msg, dict):
        return None
    if msg.get("type") == "Termination":
        return "terminated"
    if msg.get("type") == "Turn" and msg.get("transcript"):
        try:
            turn_id = int(msg["turn_order"])
        except (KeyError, TypeError, ValueError):
            return None
        final = bool(msg.get("end_of_turn")) and bool(msg.get("turn_is_formatted"))
        return TurnEvent(turn_id, str(msg["transcript"]), final)
    return None


class AssemblyAIStreamingTranscriber:
    def __init__(self, ws):
        self._ws = ws

    @classmethod
    async def connect(cls, api_key: str, speech_model: str) -> "AssemblyAIStreamingTranscriber":
        params = urlencode({"sample_rate": 16000, "encoding": "pcm_s16le",
                            "speech_model": speech_model, "format_turns": "true"})
        ws = await websockets.connect(f"{URL}?{params}", additional_headers={"Authorization": api_key})
        return cls(ws)

    async def send_audio(self, chunk: bytes) -> None:
        await self._ws.send(chunk)

    async def events(self) -> AsyncIterator[TurnEvent]:
        async for raw in self._ws:
            event = parse_message(raw)
            if event == "terminated":
                return
            if event is not None:
                yield event

    async def close(self) -> None:
        with suppress(Exception):
            await self._ws.send(json.dumps({"type": "Terminate"}))
        with suppress(Exception):
            await self._ws.close()
