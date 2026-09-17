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
