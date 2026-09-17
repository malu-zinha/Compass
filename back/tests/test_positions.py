from app.db.models import Interview, InterviewMode, InterviewStatus

POS = {"name": "Dev Python", "description": "Backend", "ideal_profile": "Autônomo e curioso",
       "skills": ["Python", "SQL"], "vacancies": 2}


def test_crud_with_ideal_profile(auth_client):
    pid = auth_client.post("/positions", json=POS).json()["id"]
    assert auth_client.get(f"/positions/{pid}").json()["ideal_profile"] == "Autônomo e curioso"
    r = auth_client.patch(f"/positions/{pid}", json={**POS, "ideal_profile": "Líder"})
    assert r.json()["ideal_profile"] == "Líder"
    page = auth_client.get("/positions?page=1&per_page=10").json()
    assert page["total"] == 1 and page["items"][0]["skills"] == ["Python", "SQL"]
    assert auth_client.delete(f"/positions/{pid}").status_code == 204
    assert auth_client.get(f"/positions/{pid}").status_code == 404


def test_validation(auth_client):
    assert auth_client.post("/positions", json={**POS, "skills": []}).status_code == 422
    assert auth_client.post("/positions", json={**POS, "vacancies": -1}).status_code == 422


def test_requires_auth(client):
    assert client.get("/positions").status_code == 401


def test_delete_position_removes_audio_files(auth_client, app, position_id, settings):
    audio = settings.audio_dir / "interview_x.mp3"
    audio.write_bytes(b"x")
    with app.state.session_factory() as db:
        db.add(Interview(position_id=position_id, candidate_name="C", candidate_email="c@x.com",
                          candidate_phone="1", mode=InterviewMode.upload, recording_consent=True,
                          audio_filename=audio.name))
        db.commit()
    auth_client.delete(f"/positions/{position_id}")
    assert not audio.exists()


def test_delete_position_removes_live_recording_pcm(auth_client, app, position_id):
    with app.state.session_factory() as db:
        interview = Interview(position_id=position_id, candidate_name="C", candidate_email="c@x.com",
                              candidate_phone="1", mode=InterviewMode.live, recording_consent=True,
                              status=InterviewStatus.recording)
        db.add(interview)
        db.commit()
        iid = interview.id
    pcm = app.state.storage.pcm_path(iid)
    pcm.write_bytes(b"\x00" * 3200)
    assert auth_client.delete(f"/positions/{position_id}").status_code == 204
    assert not pcm.exists()
