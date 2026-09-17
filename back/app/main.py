from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.api.routes import auth, health, users
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.db.session import build_engine
from app.services.storage import Storage


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    for d in (settings.data_dir, settings.audio_dir, settings.avatar_dir):
        d.mkdir(parents=True, exist_ok=True)
    app = FastAPI(title="Compass API", version="1.0.0")
    app.state.settings = settings
    app.state.engine = build_engine(settings)
    app.state.session_factory = sessionmaker(bind=app.state.engine, autoflush=False, expire_on_commit=False)
    app.state.storage = Storage(settings)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])
    register_exception_handlers(app)
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(users.router)
    return app
