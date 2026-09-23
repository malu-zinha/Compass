import time

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100


def test_me_and_update(auth_client):
    assert auth_client.get("/users/me").json()["job_title"] == "Entrevistador"
    r = auth_client.patch("/users/me", json={"phone": "11 99999-0000", "company": "ACME"})
    assert r.json()["phone"] == "11 99999-0000" and r.json()["company"] == "ACME"


def test_update_email_conflict(auth_client, client):
    client.post("/auth/register", json={"name": "B", "email": "b@example.com",
                                        "username": "b", "password": "senha-forte-123"})
    assert auth_client.patch("/users/me", json={"email": "b@example.com"}).status_code == 409


def test_update_me_ignores_explicit_nulls(auth_client):
    auth_client.patch("/users/me", json={"phone": "11 98888-7777", "company": "ACME"})
    r = auth_client.patch("/users/me", json={"name": None, "email": None, "phone": None})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Ana Souza"
    assert body["email"] == "ana@example.com"
    assert body["phone"] == "11 98888-7777"
    assert body["company"] == "ACME"


def test_avatar_upload_and_signed_download(auth_client):
    r = auth_client.post("/users/me/avatar", files={"file": ("foto.png", PNG, "image/png")})
    url = r.json()["avatar_url"]
    assert r.status_code == 200 and "signature=" in url
    assert auth_client.get(url).content == PNG
    assert auth_client.get(url.replace("signature=", "signature=x")).status_code == 403


def test_avatar_signature_invalidated_by_reupload(auth_client):
    r = auth_client.post("/users/me/avatar", files={"file": ("foto.png", PNG, "image/png")})
    url = r.json()["avatar_url"]
    assert auth_client.get(url).status_code == 200
    auth_client.post("/users/me/avatar", files={"file": ("foto2.png", PNG, "image/png")})
    assert auth_client.get(url).status_code == 403


def test_avatar_rejects_non_ascii_signature(auth_client):
    r = auth_client.post("/users/me/avatar", files={"file": ("foto.png", PNG, "image/png")})
    user_id = r.json()["avatar_url"].split("/users/")[1].split("/avatar")[0]
    expires = int(time.time()) + 3600
    r = auth_client.get(f"/users/{user_id}/avatar?expires={expires}&signature=%C3%A9")
    assert r.status_code == 403


def test_avatar_rejects_type_and_size(auth_client, settings):
    r = auth_client.post("/users/me/avatar", files={"file": ("a.txt", b"oi", "text/plain")})
    assert r.status_code == 415
    big = b"0" * (settings.max_avatar_mb * 1024 * 1024 + 1)
    r = auth_client.post("/users/me/avatar", files={"file": ("a.png", big, "image/png")})
    assert r.status_code == 413


def test_settings_defaults_and_validation(auth_client):
    s = auth_client.get("/users/me/settings").json()
    assert s == {"suggest_questions": True, "suggestion_interval_seconds": 40, "transcription_language": "pt",
                 "auto_save_notes": True, "timezone": "America/Sao_Paulo", "date_format": "DD/MM/YYYY"}
    assert auth_client.patch("/users/me/settings", json={"suggestion_interval_seconds": 5}).status_code == 422
    assert auth_client.patch("/users/me/settings", json={"timezone": "Marte/Base"}).status_code == 422
    r = auth_client.patch("/users/me/settings", json={"transcription_language": "en"})
    assert r.json()["transcription_language"] == "en"


def test_update_settings_ignores_explicit_nulls(auth_client):
    auth_client.patch("/users/me/settings", json={"transcription_language": "en"})
    r = auth_client.patch("/users/me/settings", json={"suggest_questions": None, "timezone": None})
    assert r.status_code == 200
    body = r.json()
    assert body["suggest_questions"] is True
    assert body["timezone"] == "America/Sao_Paulo"
    assert body["transcription_language"] == "en"
