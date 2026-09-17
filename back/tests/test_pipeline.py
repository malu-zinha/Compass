from app.services.transcription import TranscriptionError
from tests.fakes import FakeAnalyzer, FakeTranscriber
from tests.helpers import create_interview

MP3 = b"ID3" + b"0" * 64


def upload(client, iid):
    return client.post(f"/interviews/{iid}/audio", files={"file": ("a.mp3", MP3, "audio/mpeg")})


def test_upload_runs_until_done(auth_client, app, position_id):
    iid = create_interview(auth_client, position_id)
    assert upload(auth_client, iid).status_code == 202
    body = auth_client.get(f"/interviews/{iid}").json()  # BackgroundTasks roda antes do TestClient retornar
    assert body["status"] == "done" and body["score"] == 800 and body["audio_duration_seconds"] == 4.0
    assert body["transcript"][1] == {"speaker": "B", "text": "Sou dev", "start_ms": 1600, "end_ms": 4000}
    assert body["analysis"]["qa_pairs"][0]["question"] == "Fale de você"


def test_transcription_failure_sets_error(auth_client, app, position_id):
    error = TranscriptionError("Nenhuma fala foi detectada no áudio.")
    app.state.pipeline.transcriber = FakeTranscriber(error=error)
    iid = create_interview(auth_client, position_id)
    upload(auth_client, iid)
    body = auth_client.get(f"/interviews/{iid}").json()
    assert body["status"] == "error" and body["error_message"] == "Nenhuma fala foi detectada no áudio."


def test_unexpected_failure_has_generic_message(auth_client, app, position_id):
    app.state.pipeline.analyzer = FakeAnalyzer(error=RuntimeError("stack interna"))
    iid = create_interview(auth_client, position_id)
    upload(auth_client, iid)
    assert "stack" not in auth_client.get(f"/interviews/{iid}").json()["error_message"]


def test_reprocess_analysis_reuses_transcript(auth_client, app, position_id):
    iid = create_interview(auth_client, position_id)
    upload(auth_client, iid)
    transcriber = app.state.pipeline.transcriber
    app.state.pipeline.analyzer = FakeAnalyzer(score=950)
    r = auth_client.post(f"/interviews/{iid}/reprocess", json={"step": "analysis"})
    assert r.status_code == 202 and transcriber.calls == 1
    assert auth_client.get(f"/interviews/{iid}").json()["score"] == 950


def test_reprocess_conflicts_while_processing(auth_client, app, position_id):
    from app.db.models import Interview, InterviewStatus

    iid = create_interview(auth_client, position_id)
    with app.state.session_factory() as db:
        db.get(Interview, iid).status = InterviewStatus.analyzing
        db.commit()
    assert auth_client.post(f"/interviews/{iid}/reprocess", json={"step": "analysis"}).status_code == 409


def test_reprocess_full_without_audio_is_rejected(auth_client, position_id):
    iid = create_interview(auth_client, position_id)
    assert auth_client.post(f"/interviews/{iid}/reprocess", json={"step": "full"}).status_code == 422


def test_reprocess_analysis_without_transcript_is_rejected(auth_client, position_id):
    iid = create_interview(auth_client, position_id)
    r = auth_client.post(f"/interviews/{iid}/reprocess", json={"step": "analysis"})
    assert r.status_code == 422
    assert r.json()["detail"] == "Esta entrevista ainda não possui transcrição."


def test_same_interview_is_not_processed_twice_concurrently(app, auth_client, position_id):
    pipeline = app.state.pipeline
    iid = create_interview(auth_client, position_id)
    pipeline._running.add(iid)
    pipeline.process(iid)
    assert pipeline.transcriber.calls == 0


def test_reupload_invalidates_previous_results(auth_client, app, position_id):
    iid = create_interview(auth_client, position_id)
    assert upload(auth_client, iid).status_code == 202
    done = auth_client.get(f"/interviews/{iid}").json()
    assert done["status"] == "done" and done["score"] == 800

    error = TranscriptionError("Nenhuma fala foi detectada no áudio.")
    app.state.pipeline.transcriber = FakeTranscriber(error=error)
    assert upload(auth_client, iid).status_code == 202
    body = auth_client.get(f"/interviews/{iid}").json()
    assert body["status"] == "error"
    assert body["score"] is None
    assert body["analysis"] is None
