import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.base import Base
from app.db.models import User
from app.main import create_app


@pytest.fixture
def settings(tmp_path):
    return Settings(
        _env_file=None, openai_api_key="test", assemblyai_api_key="test",
        jwt_secret="test-secret-" + "x" * 32, data_dir=tmp_path, maintenance_enabled=False,
    )


@pytest.fixture
def app(settings):
    app = create_app(settings)
    Base.metadata.create_all(app.state.engine)
    from tests.fakes import FakeAnalyzer, FakeTranscriber

    app.state.pipeline.transcriber = FakeTranscriber()
    app.state.pipeline.analyzer = FakeAnalyzer()
    return app


@pytest.fixture
def client(app):
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def auth_client(client):
    client.post("/auth/register", json={"name": "Ana Souza", "email": "ana@example.com",
                                        "username": "ana", "password": "senha-forte-123"})
    login = client.post("/auth/login", json={"username": "ana", "password": "senha-forte-123"})
    token = login.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client


@pytest.fixture
def user(auth_client, app) -> User:
    with app.state.session_factory() as db:
        return db.query(User).filter_by(username="ana").one()


@pytest.fixture
def position_id(auth_client) -> int:
    payload = {"name": "Dev Python", "description": "Backend", "ideal_profile": "Autônomo e curioso",
               "skills": ["Python", "SQL"], "vacancies": 2}
    return auth_client.post("/positions", json=payload).json()["id"]
