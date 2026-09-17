def test_general_and_position_questions_are_separated(auth_client, position_id):
    auth_client.post("/questions", json={"text": "Fale sobre você"})
    auth_client.post("/questions", json={"text": "Por que Python?", "position_id": position_id})
    assert [q["text"] for q in auth_client.get("/questions").json()] == ["Fale sobre você"]
    assert [q["text"] for q in auth_client.get(f"/questions?position_id={position_id}").json()] == [
        "Por que Python?"
    ]


def test_edit_and_delete(auth_client):
    qid = auth_client.post("/questions", json={"text": "Antiga"}).json()["id"]
    assert auth_client.patch(f"/questions/{qid}", json={"text": "Nova"}).json()["text"] == "Nova"
    assert auth_client.patch(f"/questions/{qid}", json={"text": "  "}).status_code == 422
    assert auth_client.delete(f"/questions/{qid}").status_code == 204
    assert auth_client.delete(f"/questions/{qid}").status_code == 404


def test_unknown_position_is_rejected(auth_client):
    assert auth_client.post("/questions", json={"text": "X", "position_id": 999}).status_code == 404
