def payload(position_id, **kw):
    return {"position_id": position_id, "candidate_name": "Carla", "candidate_email": "carla@example.com",
            "candidate_phone": "11 90000-0000", "mode": "upload", "recording_consent": True, **kw}


def test_create_requires_consent(auth_client, position_id):
    r = auth_client.post("/interviews", json=payload(position_id, recording_consent=False))
    assert r.status_code == 422 and "consentimento" in r.json()["detail"]


def test_create_copies_registered_questions_and_sets_interviewer(auth_client, position_id):
    auth_client.post("/questions", json={"text": "Geral"})
    auth_client.post("/questions", json={"text": "Do cargo", "position_id": position_id})
    other_position_id = auth_client.post(
        "/positions", json={"name": "X", "description": "Y", "skills": ["Z"]}
    ).json()["id"]
    auth_client.post("/questions", json={"text": "Outro cargo", "position_id": other_position_id})
    r = auth_client.post("/interviews", json=payload(position_id))
    body = r.json()
    assert r.status_code == 201 and body["status"] == "draft" and body["interviewer_name"] == "Ana Souza"
    texts = sorted(q["text"] for q in auth_client.get(f"/interviews/{body['id']}/questions").json())
    assert texts == ["Do cargo", "Geral"]


def test_language_comes_from_user_settings(auth_client, app, position_id):
    auth_client.patch("/users/me/settings", json={"transcription_language": "es"})
    iid = auth_client.post("/interviews", json=payload(position_id)).json()["id"]
    from app.db.models import Interview
    with app.state.session_factory() as db:
        assert db.get(Interview, iid).language == "es"


def test_list_is_light_filtered_sorted_and_paginated(auth_client, app, position_id):
    from app.db.models import Interview, InterviewStatus
    ids = [
        auth_client.post("/interviews", json=payload(position_id, candidate_name=f"C{n}")).json()["id"]
        for n in range(3)
    ]
    with app.state.session_factory() as db:
        for iid, score in zip(ids, [300, None, 900], strict=False):
            i = db.get(Interview, iid); i.score = score  # noqa: E702
            i.status = InterviewStatus.done if score else InterviewStatus.draft
            i.analysis = {"positives": ["p"], "negatives": ["n"]} if score else None
        db.commit()
    page = auth_client.get(f"/interviews?position_id={position_id}&status=done&sort=-score").json()
    assert [i["score"] for i in page["items"]] == [900, 300]
    assert "transcript" not in page["items"][0] and page["items"][0]["positives"] == ["p"]
    page2 = auth_client.get("/interviews?per_page=2&page=2").json()
    assert page2["total"] == 3 and len(page2["items"]) == 1


def test_get_update_delete(auth_client, position_id):
    iid = auth_client.post("/interviews", json=payload(position_id)).json()["id"]
    r = auth_client.patch(f"/interviews/{iid}", json={"notes": "Boa comunicação"})
    assert r.json()["notes"] == "Boa comunicação"
    assert auth_client.delete(f"/interviews/{iid}").status_code == 204
    assert auth_client.get(f"/interviews/{iid}").status_code == 404


def test_update_validates_fields_and_keeps_stored_values(auth_client, position_id):
    iid = auth_client.post("/interviews", json=payload(position_id)).json()["id"]
    assert auth_client.patch(f"/interviews/{iid}", json={"candidate_email": "nope"}).status_code == 422
    assert auth_client.patch(f"/interviews/{iid}", json={"candidate_name": ""}).status_code == 422
    body = auth_client.get(f"/interviews/{iid}").json()
    assert body["candidate_name"] == "Carla" and body["candidate_email"] == "carla@example.com"


def test_get_tolerates_invalid_stored_analysis(auth_client, app, position_id):
    from app.db.models import Interview

    iid = auth_client.post("/interviews", json=payload(position_id)).json()["id"]
    with app.state.session_factory() as db:
        db.get(Interview, iid).analysis = {"positives": ["p"]}
        db.commit()
    r = auth_client.get(f"/interviews/{iid}")
    assert r.status_code == 200 and r.json()["analysis"] is None


def test_mark_question_asked(auth_client, position_id):
    auth_client.post("/questions", json={"text": "Geral"})
    iid = auth_client.post("/interviews", json=payload(position_id)).json()["id"]
    qid = auth_client.get(f"/interviews/{iid}/questions").json()[0]["id"]
    r = auth_client.patch(f"/interviews/{iid}/questions/{qid}", json={"asked": True})
    assert r.json()["asked"] is True and r.json()["asked_at"] is not None
