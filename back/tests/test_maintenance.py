import asyncio
import os
from datetime import UTC, datetime, timedelta

from app.core import maintenance
from app.db.models import Interview, InterviewMode, InterviewStatus


def _add(app, position_id, **kw):
    with app.state.session_factory() as db:
        i = Interview(
            position_id=position_id, candidate_name="C", candidate_email="c@x.com", candidate_phone="1",
            mode=InterviewMode.upload, recording_consent=True, **kw,
        )
        db.add(i)
        db.commit()
        return i.id


def test_old_drafts_without_audio_are_deleted(app, position_id):
    old = _add(app, position_id, created_at=datetime.now(UTC) - timedelta(hours=30))
    new = _add(app, position_id)
    maintenance.run_once(app.state, datetime.now(UTC))
    with app.state.session_factory() as db:
        assert db.get(Interview, old) is None and db.get(Interview, new) is not None


def test_old_draft_pcm_is_also_deleted(app, position_id):
    old = _add(app, position_id, created_at=datetime.now(UTC) - timedelta(hours=30))
    app.state.storage.pcm_path(old).write_bytes(b"x")
    maintenance.run_once(app.state, datetime.now(UTC))
    assert not app.state.storage.pcm_path(old).exists()


def test_pending_interviews_are_requeued(app, position_id):
    a = _add(app, position_id, status=InterviewStatus.transcribing, audio_filename="a.mp3")
    b = _add(
        app, position_id, status=InterviewStatus.analyzing, audio_filename="b.mp3",
        transcript=[{"speaker": "A", "text": "x", "start_ms": 0, "end_ms": 1}],
    )
    jobs = maintenance.run_once(app.state, datetime.now(UTC))
    assert (a, "full") in jobs and (b, "analysis") in jobs


def test_running_interviews_are_not_requeued(app, position_id):
    a = _add(app, position_id, status=InterviewStatus.transcribing, audio_filename="a.mp3")
    app.state.pipeline._running.add(a)
    jobs = maintenance.run_once(app.state, datetime.now(UTC))
    assert a not in [job_id for job_id, _ in jobs]


def test_retention_removes_old_audio(app, position_id, settings):
    settings.audio_retention_days = 30
    (settings.audio_dir / "old.mp3").write_bytes(b"x")
    iid = _add(
        app, position_id, status=InterviewStatus.done, audio_filename="old.mp3",
        created_at=datetime.now(UTC) - timedelta(days=31),
    )
    maintenance.run_once(app.state, datetime.now(UTC))
    assert not (settings.audio_dir / "old.mp3").exists()
    with app.state.session_factory() as db:
        assert db.get(Interview, iid).audio_filename is None


def test_retention_disabled_keeps_old_audio(app, position_id, settings):
    settings.audio_retention_days = 0
    (settings.audio_dir / "old.mp3").write_bytes(b"x")
    iid = _add(
        app, position_id, status=InterviewStatus.done, audio_filename="old.mp3",
        created_at=datetime.now(UTC) - timedelta(days=3650),
    )
    maintenance.run_once(app.state, datetime.now(UTC))
    assert (settings.audio_dir / "old.mp3").exists()
    with app.state.session_factory() as db:
        assert db.get(Interview, iid).audio_filename == "old.mp3"


def _age(path, minutes: int) -> None:
    old = (datetime.now(UTC) - timedelta(minutes=minutes)).timestamp()
    os.utime(path, (old, old))


def test_abandoned_recording_is_finalized_and_queued(app, position_id, settings):
    iid = _add(app, position_id, status=InterviewStatus.recording)
    pcm = settings.audio_dir / f"interview_{iid}.pcm"
    pcm.write_bytes(b"\x00" * 32000)
    _age(pcm, 30)
    jobs = maintenance.run_once(app.state, datetime.now(UTC))
    assert (iid, "full") in jobs and not pcm.exists()
    with app.state.session_factory() as db:
        i = db.get(Interview, iid)
        assert i.status == InterviewStatus.uploaded and i.audio_filename == f"interview_{iid}.wav"
        assert i.audio_duration_seconds == 1.0


def test_active_or_recent_recordings_are_left_alone(app, position_id, settings):
    active = _add(app, position_id, status=InterviewStatus.recording)
    recent = _add(app, position_id, status=InterviewStatus.recording)
    for iid in (active, recent):
        (settings.audio_dir / f"interview_{iid}.pcm").write_bytes(b"\x00" * 32000)
    _age(settings.audio_dir / f"interview_{active}.pcm", 30)
    asyncio.run(app.state.live_registry.acquire(active, object()))
    jobs = maintenance.run_once(app.state, datetime.now(UTC))
    assert jobs == []
    with app.state.session_factory() as db:
        assert {db.get(Interview, i).status for i in (active, recent)} == {InterviewStatus.recording}


def test_abandoned_recording_without_audio_is_marked_error(app, position_id):
    iid = _add(app, position_id, status=InterviewStatus.recording,
               updated_at=datetime.now(UTC) - timedelta(minutes=30))
    jobs = maintenance.run_once(app.state, datetime.now(UTC))
    assert iid not in [job_id for job_id, _ in jobs]
    with app.state.session_factory() as db:
        i = db.get(Interview, iid)
        assert i.status == InterviewStatus.error and i.error_message == "Nenhum áudio foi gravado."
