import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.api.routes import auth, comparisons, health, interviews, live, positions, questions, users
from app.core import maintenance
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.db.session import build_engine
from app.services.analysis import OpenAIAnalyzer
from app.services.comparison import OpenAIComparator
from app.services.live.registry import LiveRegistry
from app.services.live.suggestions import OpenAISuggester
from app.services.live.upstream import AssemblyAIStreamingTranscriber
from app.services.pipeline import Pipeline
from app.services.storage import Storage
from app.services.transcription import AssemblyAITranscriber


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    for d in (settings.data_dir, settings.audio_dir, settings.avatar_dir):
        d.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        task = asyncio.create_task(maintenance.loop(_app.state)) if settings.maintenance_enabled else None
        yield
        if task is not None:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    app = FastAPI(title="Compass API", version="1.0.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = build_engine(settings)
    app.state.session_factory = sessionmaker(bind=app.state.engine, autoflush=False, expire_on_commit=False)
    app.state.storage = Storage(settings)
    app.state.pipeline = Pipeline(
        app.state.session_factory,
        app.state.storage,
        AssemblyAITranscriber(settings.assemblyai_api_key.get_secret_value()),
        OpenAIAnalyzer(settings),
    )
    app.state.background: set[asyncio.Task] = set()
    app.state.streaming_factory = lambda language: AssemblyAIStreamingTranscriber.connect(
        settings.assemblyai_api_key.get_secret_value(), settings.assemblyai_streaming_model
    )
    app.state.suggester = OpenAISuggester(settings)
    app.state.comparator = OpenAIComparator(settings)
    app.state.live_registry = LiveRegistry()
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])
    register_exception_handlers(app)
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(positions.router)
    app.include_router(questions.router)
    app.include_router(interviews.router)
    app.include_router(live.router)
    app.include_router(comparisons.router)
    return app
