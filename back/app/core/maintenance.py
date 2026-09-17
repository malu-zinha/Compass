import asyncio
import logging
from datetime import UTC, datetime, timedelta

from app.db.models import PROCESSING_STATUSES, Interview, InterviewStatus
from app.services.live.persistence import finalize_interview_recording

logger = logging.getLogger(__name__)


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def run_once(state, now: datetime) -> list[tuple[int, str]]:
    settings, storage, pipeline = state.settings, state.storage, state.pipeline
    jobs: list[tuple[int, str]] = []
    with state.session_factory() as db:
        # 1. rascunhos sem áudio expirados (TTL)
        draft_cutoff = now - timedelta(hours=settings.draft_ttl_hours)
        drafts = (
            db.query(Interview)
            .filter(Interview.status == InterviewStatus.draft, Interview.audio_filename.is_(None))
            .all()
        )
        expired_drafts = [i for i in drafts if _aware(i.created_at) < draft_cutoff]
        for interview in expired_drafts:
            storage.pcm_path(interview.id).unlink(missing_ok=True)
            db.delete(interview)
        if expired_drafts:
            db.commit()
            logger.info("Manutenção: %s rascunhos expirados removidos", len(expired_drafts))

        # 2. retenção de áudio de entrevistas concluídas
        if settings.audio_retention_days > 0:
            retention_cutoff = now - timedelta(days=settings.audio_retention_days)
            done_with_audio = (
                db.query(Interview)
                .filter(Interview.status == InterviewStatus.done, Interview.audio_filename.isnot(None))
                .all()
            )
            expired_audio = [i for i in done_with_audio if _aware(i.created_at) < retention_cutoff]
            for interview in expired_audio:
                storage.delete_file(settings.audio_dir, interview.audio_filename)
                interview.audio_filename = None
            if expired_audio:
                db.commit()
                logger.info("Manutenção: áudio de %s entrevistas removido por retenção", len(expired_audio))

        # 3. gravações ao vivo abandonadas (sem conexão ativa e paradas há mais que o limite);
        #    as finalizadas viram `uploaded` e entram na fila no passo 4.
        registry = getattr(state, "live_registry", None)
        abandon_cutoff = now - timedelta(minutes=settings.live_abandon_minutes)
        recordings = db.query(Interview).filter(Interview.status == InterviewStatus.recording).all()
        recovered = 0
        for interview in recordings:
            if registry is not None and registry.is_active(interview.id):
                continue
            pcm = storage.pcm_path(interview.id)
            if pcm.exists():
                last_activity = datetime.fromtimestamp(pcm.stat().st_mtime, UTC)
            else:
                last_activity = _aware(interview.updated_at)
            if last_activity >= abandon_cutoff:
                continue
            try:
                finalize_interview_recording(db, storage, interview)
                recovered += 1
            except Exception:  # uma gravação com problema não bloqueia o resto da manutenção
                db.rollback()
                logger.exception("Manutenção: falha ao finalizar a gravação da entrevista %s", interview.id)
        if recovered:
            logger.info("Manutenção: %s gravações ao vivo abandonadas finalizadas", recovered)

        # 4. reenfileira entrevistas em processamento que não estão rodando
        pending = db.query(Interview).filter(Interview.status.in_(PROCESSING_STATUSES)).all()
        for interview in pending:
            if pipeline.is_running(interview.id):
                continue
            if interview.status == InterviewStatus.analyzing and interview.transcript:
                jobs.append((interview.id, "analysis"))
            else:
                jobs.append((interview.id, "full"))
        if jobs:
            logger.info("Manutenção: %s entrevistas reenfileiradas", len(jobs))
    return jobs


def schedule(state, jobs: list[tuple[int, str]]) -> None:
    for interview_id, step in jobs:
        task = asyncio.create_task(asyncio.to_thread(state.pipeline.process, interview_id, step))
        state.background.add(task)
        task.add_done_callback(state.background.discard)


async def loop(state) -> None:
    settings = state.settings
    while True:
        try:
            jobs = await asyncio.to_thread(run_once, state, datetime.now(UTC))
            schedule(state, jobs)
        except Exception:
            logger.exception("Falha no laço de manutenção")
        await asyncio.sleep(settings.maintenance_interval_seconds)
