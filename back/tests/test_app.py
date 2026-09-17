from pathlib import Path

from app.core.errors import NotFound


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_cors_allows_configured_origin(client):
    r = client.options(
        "/health",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_paths_do_not_depend_on_cwd(settings, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path.parent)
    assert Path(settings.database_url.removeprefix("sqlite:///")).is_absolute()


def test_relative_data_dir_is_resolved_from_back_dir():
    from app.core.config import BASE_DIR, Settings
    s = Settings(
        _env_file=None, openai_api_key="t", assemblyai_api_key="t",
        jwt_secret="t" * 40, data_dir="./data",
    )
    assert s.data_dir == BASE_DIR / "data"


def test_app_error_is_serialized(app, client):
    @app.get("/boom-404")
    def boom():
        raise NotFound("Entrevista não encontrada")
    r = client.get("/boom-404")
    assert r.status_code == 404 and r.json() == {"detail": "Entrevista não encontrada"}


def test_unexpected_error_hides_internal_details(app, client):
    @app.get("/boom")
    def boom():
        raise RuntimeError("/Users/segredo/interviews.db")
    r = client.get("/boom")
    assert r.status_code == 500
    assert r.json() == {"detail": "Erro interno do servidor"}
