REG = {"name": "Ana Souza", "email": "ana@example.com", "username": "ana", "password": "senha-forte-123"}


def test_register_and_login(client):
    r = client.post("/auth/register", json=REG)
    assert r.status_code == 201 and "password_hash" not in r.json()
    r = client.post("/auth/login", json={"username": "ana", "password": "senha-forte-123"})
    body = r.json()
    assert r.status_code == 200 and body["token_type"] == "bearer" and body["user"]["username"] == "ana"


def test_register_duplicate_username_or_email_conflicts(client):
    client.post("/auth/register", json=REG)
    assert client.post("/auth/register", json={**REG, "email": "outra@example.com"}).status_code == 409
    assert client.post("/auth/register", json={**REG, "username": "outra"}).status_code == 409


def test_register_rejects_short_password(client):
    assert client.post("/auth/register", json={**REG, "password": "123"}).status_code == 422


def test_login_wrong_password(client):
    client.post("/auth/register", json=REG)
    r = client.post("/auth/login", json={"username": "ana", "password": "errada-123"})
    assert r.status_code == 401 and r.json()["detail"] == "Usuário ou senha incorretos."


def test_protected_route_requires_token(client):
    assert client.get("/users/me").status_code == 401
    assert client.get("/users/me", headers={"Authorization": "Bearer lixo"}).status_code == 401
