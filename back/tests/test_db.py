from alembic.config import Config
from sqlalchemy import inspect

from alembic import command
from app.core.config import BASE_DIR
from app.db.models import Interview, InterviewMode, InterviewQuestion, Position, Question, QuestionSource


def _position(db):
    p = Position(name="Dev Python", description="Backend", skills=["Python"], vacancies=1)
    db.add(p); db.commit()  # noqa: E702
    return p


def test_foreign_keys_are_enforced_and_cascade(app):
    with app.state.session_factory() as db:
        p = _position(db)
        i = Interview(position_id=p.id, candidate_name="C", candidate_email="c@x.com", candidate_phone="1",
                      mode=InterviewMode.upload, recording_consent=True)
        db.add_all([i, Question(text="Por que nós?", position_id=p.id)]); db.commit()  # noqa: E702
        db.add(InterviewQuestion(interview_id=i.id, text="Q", source=QuestionSource.registered)); db.commit()  # noqa: E702
        db.delete(p); db.commit()  # noqa: E702
        assert db.query(Interview).count() == 0
        assert db.query(Question).count() == 0
        assert db.query(InterviewQuestion).count() == 0


def test_transcript_and_analysis_roundtrip_as_json(app):
    with app.state.session_factory() as db:
        p = _position(db)
        i = Interview(position_id=p.id, candidate_name="C", candidate_email="c@x.com", candidate_phone="1",
                      mode=InterviewMode.live, recording_consent=True,
                      transcript=[{"speaker": "A", "text": "Oi", "start_ms": 0, "end_ms": 10}])
        db.add(i); db.commit(); db.expire_all()  # noqa: E702
        assert db.get(Interview, i.id).transcript[0]["speaker"] == "A"


def test_alembic_upgrade_creates_schema(settings, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(settings.data_dir))
    monkeypatch.setenv("OPENAI_API_KEY", "t"); monkeypatch.setenv("ASSEMBLYAI_API_KEY", "t")  # noqa: E702
    monkeypatch.setenv("JWT_SECRET", "t" * 40)
    from app.core.config import get_settings
    get_settings.cache_clear()
    cfg = Config(str(BASE_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BASE_DIR / "alembic"))
    command.upgrade(cfg, "head")
    from sqlalchemy import create_engine
    tables = set(inspect(create_engine(settings.database_url)).get_table_names())
    assert {"users", "user_settings", "positions", "questions", "interviews", "interview_questions"} <= tables
    get_settings.cache_clear()
