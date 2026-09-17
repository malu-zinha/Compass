import asyncio
import threading
import time

import pytest
from starlette.websockets import WebSocketDisconnect

from app.db.models import Interview, InterviewStatus, UserSettings
from app.services.live import session as live_session
from app.services.live.persistence import finalize_recording
from tests.fakes import FakeStreaming, FakeSuggester
from tests.helpers import create_interview

PCM = b"\x00\x01" * 1600  # 100 ms


@pytest.fixture
def live(app, auth_client, position_id):
    streaming = FakeStreaming()

    async def factory(language):
        return streaming

    app.state.streaming_factory = factory
    app.state.suggester = FakeSuggester()
    iid = create_interview(auth_client, position_id, mode="live")
    token = auth_client.headers["Authorization"].removeprefix("Bearer ")
    return iid, token, streaming


def wait_status(client, iid, expected, timeout=3):
    end = time.time() + timeout
    while time.time() < end:
        if client.get(f"/interviews/{iid}").json()["status"] == expected:
            return True
        time.sleep(0.05)
    return False


def test_rejects_invalid_token(client, live):
    iid, _, _ = live
    with client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": "lixo"})
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 4401


def test_unknown_interview_is_closed_with_4404(auth_client, live):
    _, token, _ = live
    with auth_client.websocket_connect("/interviews/9999/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 4404


def test_interview_outside_live_statuses_is_closed_with_4409(auth_client, app, live):
    iid, token, _ = live
    with app.state.session_factory() as db:
        db.get(Interview, iid).status = InterviewStatus.done
        db.commit()
    with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 4409
    assert auth_client.get(f"/interviews/{iid}").json()["status"] == "done"


def test_full_session_records_transcribes_and_processes(auth_client, app, live, settings):
    iid, token, streaming = live
    with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        assert ws.receive_json() == {"type": "ready"}
        ws.send_bytes(PCM)
        assert ws.receive_json() == {"type": "transcript", "turn_id": 1, "text": "olá", "is_final": False}
        assert ws.receive_json()["is_final"] is True
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "session_ended"}
    assert streaming.closed
    assert wait_status(auth_client, iid, "done")
    body = auth_client.get(f"/interviews/{iid}").json()
    assert body["has_audio"] is True
    assert body["audio_duration_seconds"] == 4.0  # a duração da transcrição (FakeTranscriber) prevalece
    assert settings.audio_dir.joinpath(f"interview_{iid}.wav").stat().st_size == 44 + len(PCM)
    assert not settings.audio_dir.joinpath(f"interview_{iid}.pcm").exists()


def test_upstream_unavailable_still_records(auth_client, app, live):
    iid, token, _ = live

    async def broken(language):
        raise OSError("sem rede")

    app.state.streaming_factory = broken
    with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        assert ws.receive_json() == {"type": "ready"}
        assert ws.receive_json()["type"] == "error"
        ws.send_bytes(PCM)
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "session_ended"}
    assert wait_status(auth_client, iid, "done")


class FailingEvents(FakeStreaming):
    async def events(self):
        yield await self.queue.get()
        raise ConnectionError("streaming caiu")


class HangingStreaming(FakeStreaming):
    async def send_audio(self, chunk):
        await asyncio.sleep(3600)

    async def close(self):
        await asyncio.sleep(3600)


def _use_streaming(app, streaming):
    async def factory(language):
        return streaming

    app.state.streaming_factory = factory


def test_upstream_failure_mid_session_keeps_recording(auth_client, app, live, settings):
    iid, token, _ = live
    streaming = FailingEvents()
    _use_streaming(app, streaming)
    with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        assert ws.receive_json() == {"type": "ready"}
        ws.send_bytes(PCM)
        assert ws.receive_json()["type"] == "transcript"
        assert ws.receive_json()["type"] == "error"
        ws.send_bytes(PCM)
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "session_ended"}
    assert streaming.count == 1 and streaming.closed  # não envia mais ao upstream, mas sempre o encerra
    assert wait_status(auth_client, iid, "done")
    assert settings.audio_dir.joinpath(f"interview_{iid}.wav").stat().st_size == 44 + 2 * len(PCM)


def test_hanging_upstream_does_not_block_recording_or_stop(auth_client, app, live, settings, monkeypatch):
    monkeypatch.setattr(live_session, "SEND_TIMEOUT_SECONDS", 0.2)
    monkeypatch.setattr(live_session, "CLOSE_TIMEOUT_SECONDS", 0.2)
    iid, token, _ = live
    _use_streaming(app, HangingStreaming())
    started = time.monotonic()
    with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        assert ws.receive_json() == {"type": "ready"}
        ws.send_bytes(PCM)
        assert ws.receive_json()["type"] == "error"
        ws.send_bytes(PCM)
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "session_ended"}
    assert time.monotonic() - started < 3
    assert wait_status(auth_client, iid, "done")
    assert settings.audio_dir.joinpath(f"interview_{iid}.wav").stat().st_size == 44 + 2 * len(PCM)


def test_new_connection_replaces_previous_and_keeps_appending(auth_client, app, live, settings):
    iid, token, _ = live
    url = f"/interviews/{iid}/live"
    with auth_client.websocket_connect(url) as second:
        with auth_client.websocket_connect(url) as first:
            first.send_json({"type": "auth", "token": token})
            assert first.receive_json() == {"type": "ready"}
            first.send_bytes(PCM)
            first.receive_json()
            first.receive_json()
            second.send_json({"type": "auth", "token": token})
            with pytest.raises(WebSocketDisconnect) as exc:
                first.receive_json()
            assert exc.value.code == 4000
        assert second.receive_json() == {"type": "ready"}
        second.send_bytes(PCM)
        second.receive_json()
        second.receive_json()
        second.send_json({"type": "stop"})
        assert second.receive_json() == {"type": "session_ended"}
    assert not app.state.live_registry.is_active(iid)
    assert wait_status(auth_client, iid, "done")
    assert settings.audio_dir.joinpath(f"interview_{iid}.wav").stat().st_size == 44 + 2 * len(PCM)


class BlockingClose(FakeStreaming):
    """`close()` só termina quando o teste liberar: segura a conexão dentro do `stop`."""

    def __init__(self):
        super().__init__()
        self.closing, self.release = threading.Event(), threading.Event()

    async def close(self):
        self.closing.set()
        while not self.release.is_set():
            await asyncio.sleep(0.01)
        self.closed = True


def test_reconnect_during_stop_cannot_overwrite_the_recording(auth_client, app, live, settings, monkeypatch):
    monkeypatch.setattr(live_session, "CLOSE_TIMEOUT_SECONDS", 30)
    scheduled = []
    real_schedule = live_session.schedule

    def spy_schedule(state, jobs):
        scheduled.extend(jobs)
        real_schedule(state, jobs)

    monkeypatch.setattr(live_session, "schedule", spy_schedule)
    iid, token, _ = live
    streaming = BlockingClose()
    _use_streaming(app, streaming)
    first_audio = PCM * 10
    url = f"/interviews/{iid}/live"
    try:
        with auth_client.websocket_connect(url) as first:
            first.send_json({"type": "auth", "token": token})
            assert first.receive_json() == {"type": "ready"}
            first.send_bytes(first_audio)
            first.receive_json()
            first.receive_json()
            first.send_json({"type": "stop"})
            assert streaming.closing.wait(timeout=3)  # a primeira está no stop, ainda sem finalizar
            with auth_client.websocket_connect(url) as second:
                second.send_json({"type": "auth", "token": token})
                with pytest.raises(WebSocketDisconnect) as replaced:
                    first.receive_json()  # a segunda passou do 4409 inicial e está no acquire
                assert replaced.value.code == 4000
                streaming.release.set()  # a primeira finaliza e libera o registry
                with pytest.raises(WebSocketDisconnect) as rejected:
                    second.receive_json()
                assert rejected.value.code == 4409
    finally:
        streaming.release.set()
    assert wait_status(auth_client, iid, "done")
    assert scheduled == [(iid, "full")]
    assert app.state.pipeline.transcriber.calls == 1
    assert settings.audio_dir.joinpath(f"interview_{iid}.wav").stat().st_size == 44 + len(first_audio)


def test_finalize_only_claims_interviews_still_recording(app, live, settings):
    iid, _, _ = live
    wav = settings.audio_dir / f"interview_{iid}.wav"
    wav.write_bytes(b"A" * 100)
    pcm = app.state.storage.pcm_path(iid)
    pcm.write_bytes(PCM)
    with app.state.session_factory() as db:
        interview = db.get(Interview, iid)
        interview.status, interview.audio_filename = InterviewStatus.uploaded, wav.name
        db.commit()
    assert finalize_recording(app.state, iid) is False
    assert wav.read_bytes() == b"A" * 100 and pcm.exists()
    with app.state.session_factory() as db:
        assert db.get(Interview, iid).status == InterviewStatus.uploaded


def test_stop_without_audio_marks_error(auth_client, app, live, settings):
    iid, token, _ = live
    with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        assert ws.receive_json() == {"type": "ready"}
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "session_ended"}
    body = auth_client.get(f"/interviews/{iid}").json()
    assert body["status"] == "error" and body["error_message"] == "Nenhum áudio foi gravado."
    assert app.state.pipeline.transcriber.calls == 0
    assert not settings.audio_dir.joinpath(f"interview_{iid}.pcm").exists()


def test_disconnect_without_stop_keeps_recording_for_reconnect(auth_client, live, settings):
    iid, token, _ = live
    with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        ws.receive_json()
        ws.send_bytes(PCM)
        ws.receive_json()
        ws.receive_json()
    assert wait_status(auth_client, iid, "recording")
    assert settings.audio_dir.joinpath(f"interview_{iid}.pcm").stat().st_size == len(PCM)


def test_reconnect_appends_and_stop_finalizes_everything(auth_client, live, settings):
    iid, token, _ = live
    for stop in (False, True):
        with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
            ws.send_json({"type": "auth", "token": token})
            assert ws.receive_json() == {"type": "ready"}
            ws.send_bytes(PCM)
            ws.receive_json()
            ws.receive_json()
            if stop:
                ws.send_json({"type": "stop"})
                assert ws.receive_json() == {"type": "session_ended"}
    assert wait_status(auth_client, iid, "done")
    assert settings.audio_dir.joinpath(f"interview_{iid}.wav").stat().st_size == 44 + 2 * len(PCM)


def test_suggestions_are_saved_and_errors_do_not_end_session(auth_client, app, live):
    iid, token, _ = live
    auth_client.get("/users/me/settings")  # cria as configurações padrão
    with app.state.session_factory() as db:
        db.query(UserSettings).update({"suggestion_interval_seconds": 1})
        db.commit()
    with auth_client.websocket_connect(f"/interviews/{iid}/live") as ws:
        ws.send_json({"type": "auth", "token": token})
        ws.receive_json()
        ws.send_bytes(PCM)
        ws.receive_json()
        ws.receive_json()
        msg = ws.receive_json()  # chega após ~1s
        assert msg["type"] == "suggestions" and msg["questions"][0]["source"] == "ai"
        app.state.suggester.error = RuntimeError("OpenAI fora")
        ws.send_bytes(PCM)
        ws.receive_json()
        ws.receive_json()
        time.sleep(1.2)
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "session_ended"}
    questions = auth_client.get(f"/interviews/{iid}/questions").json()
    assert any(q["text"] == "Pode dar um exemplo?" and q["source"] == "ai" for q in questions)
