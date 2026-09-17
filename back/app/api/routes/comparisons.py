import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.errors import AppError, NotFound, Unprocessable
from app.db.models import Interview, InterviewStatus, User
from app.db.session import get_db
from app.schemas.comparisons import ComparisonRequest, ComparisonResult
from app.services.comparison import ComparisonError, ComparisonInput

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comparisons", tags=["comparisons"])

_INVALID_AI_RESPONSE = "A IA retornou uma comparação inválida. Tente novamente."


@router.post("", response_model=ComparisonResult)
def compare_interviews(
    payload: ComparisonRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ComparisonResult:
    ids = payload.interview_ids
    if len(set(ids)) != len(ids):
        raise Unprocessable("Selecione entrevistas diferentes.")

    by_id = {i.id: i for i in db.query(Interview).filter(Interview.id.in_(ids)).all()}
    if any(interview_id not in by_id for interview_id in ids):
        raise NotFound("Entrevista não encontrada.")

    interviews = [by_id[interview_id] for interview_id in ids]
    if any(i.status != InterviewStatus.done for i in interviews):
        raise Unprocessable("Só é possível comparar entrevistas já analisadas.")
    if len({i.position_id for i in interviews}) > 1:
        raise Unprocessable("Selecione entrevistas do mesmo cargo.")

    position = interviews[0].position
    candidates = []
    for i in interviews:
        analysis = i.analysis if isinstance(i.analysis, dict) else {}
        candidates.append({
            "interview_id": i.id,
            "candidate_name": i.candidate_name,
            "score": i.score,
            "summary": analysis.get("summary", ""),
            "positives": analysis.get("positives", []),
            "negatives": analysis.get("negatives", []),
            "ideal_profile_fit": analysis.get("ideal_profile_fit", ""),
        })

    data = ComparisonInput(position.name, position.ideal_profile, candidates)
    logger.info("Comparação solicitada para %s entrevistas: %s", len(ids), ids)
    try:
        result = request.app.state.comparator.compare(data)
    except ComparisonError as exc:
        raise AppError(502, _INVALID_AI_RESPONSE) from exc

    if {r.interview_id for r in result.ranking} != set(ids):
        raise AppError(502, _INVALID_AI_RESPONSE)

    return result
