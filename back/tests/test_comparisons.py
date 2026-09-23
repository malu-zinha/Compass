from tests.helpers import create_interview


def _done(app, position_id, name, score):
    from app.db.models import Interview, InterviewMode, InterviewStatus
    from tests.fakes import make_analysis
    with app.state.session_factory() as db:
        i = Interview(position_id=position_id, candidate_name=name, candidate_email="c@x.com",
                      candidate_phone="1", mode=InterviewMode.upload, recording_consent=True,
                      status=InterviewStatus.done, score=score, analysis=make_analysis(score).model_dump())
        db.add(i); db.commit(); return i.id  # noqa: E702


def test_compare_same_position(auth_client, app, position_id):
    ids = [_done(app, position_id, "A", 700), _done(app, position_id, "B", 900)]
    r = auth_client.post("/comparisons", json={"interview_ids": ids})
    assert r.status_code == 200 and {x["interview_id"] for x in r.json()["ranking"]} == set(ids)


def test_rejects_different_positions_or_unfinished(auth_client, app, position_id):
    payload = {"name": "X", "description": "Y", "skills": ["Z"]}
    other = auth_client.post("/positions", json=payload).json()["id"]
    a, b = _done(app, position_id, "A", 700), _done(app, other, "B", 900)
    assert auth_client.post("/comparisons", json={"interview_ids": [a, b]}).status_code == 422
    draft = create_interview(auth_client, position_id)
    assert auth_client.post("/comparisons", json={"interview_ids": [a, draft]}).status_code == 422


def test_count_limits(auth_client):
    assert auth_client.post("/comparisons", json={"interview_ids": [1]}).status_code == 422
    assert auth_client.post("/comparisons", json={"interview_ids": [1, 2, 3, 4]}).status_code == 422


def test_ranking_ids_from_model_are_validated(auth_client, app, position_id):
    from app.schemas.comparisons import ComparisonRank, ComparisonResult
    ids = [_done(app, position_id, "A", 700), _done(app, position_id, "B", 900)]
    bad_rank = ComparisonRank(interview_id=999, rank=1, rationale="?")
    app.state.comparator.result = ComparisonResult(summary="x", ranking=[bad_rank])
    assert auth_client.post("/comparisons", json={"interview_ids": ids}).status_code == 502


def test_duplicate_ids_rejected(auth_client, app, position_id):
    a = _done(app, position_id, "A", 700)
    r = auth_client.post("/comparisons", json={"interview_ids": [a, a]})
    assert r.status_code == 422 and r.json()["detail"] == "Selecione entrevistas diferentes."


def test_unknown_id_returns_404(auth_client, app, position_id):
    a = _done(app, position_id, "A", 700)
    r = auth_client.post("/comparisons", json={"interview_ids": [a, 999999]})
    assert r.status_code == 404 and r.json()["detail"] == "Entrevista não encontrada."


def test_comparator_error_is_mapped_to_502(auth_client, app, position_id):
    from app.services.comparison import ComparisonError

    class RaisingComparator:
        def compare(self, data):
            raise ComparisonError("A IA não retornou uma comparação válida. Tente novamente.")

    ids = [_done(app, position_id, "A", 700), _done(app, position_id, "B", 900)]
    app.state.comparator = RaisingComparator()
    r = auth_client.post("/comparisons", json={"interview_ids": ids})
    assert r.status_code == 502
    assert r.json()["detail"] == "A IA retornou uma comparação inválida. Tente novamente."


def test_error_messages_are_exact(auth_client, app, position_id):
    payload = {"name": "X2", "description": "Y", "skills": ["Z"]}
    other = auth_client.post("/positions", json=payload).json()["id"]
    a, b = _done(app, position_id, "A", 700), _done(app, other, "B", 900)
    r = auth_client.post("/comparisons", json={"interview_ids": [a, b]})
    assert r.status_code == 422
    assert r.json()["detail"] == "Selecione entrevistas do mesmo cargo."

    draft = create_interview(auth_client, position_id)
    r2 = auth_client.post("/comparisons", json={"interview_ids": [a, draft]})
    assert r2.status_code == 422
    assert r2.json()["detail"] == "Só é possível comparar entrevistas já analisadas."
