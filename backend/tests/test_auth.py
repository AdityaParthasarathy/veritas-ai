"""Registration, login, token handling and abuse protection."""

from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.core.config import settings
from app.core.throttle import MAX_FAILURES

PASSWORD = "correct-horse-battery"


def test_register_login_and_me(client):
    r = client.post("/api/v1/auth/register", json={"email": "Ada@Example.com", "password": PASSWORD, "full_name": "Ada"})
    assert r.status_code == 201
    body = r.json()
    assert body["token_type"] == "bearer" and body["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    assert body["user"]["email"] == "ada@example.com"  # normalised to lower case
    assert "password" not in r.text.lower()

    login = client.post("/api/v1/auth/login", json={"email": "ADA@example.com", "password": PASSWORD})
    assert login.status_code == 200
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
    assert me.status_code == 200 and me.json()["email"] == "ada@example.com"
    assert "password_hash" not in me.text


def test_password_is_stored_hashed(client):
    from sqlalchemy import text

    from app.database.session import engine

    client.post("/api/v1/auth/register", json={"email": "h@example.com", "password": PASSWORD})
    with engine.connect() as c:
        stored = c.execute(text("SELECT password_hash FROM users WHERE email='h@example.com'")).scalar()
    assert stored.startswith("$2") and PASSWORD not in stored


def test_duplicate_email_rejected(client):
    payload = {"email": "dup@example.com", "password": PASSWORD}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    r = client.post("/api/v1/auth/register", json={**payload, "email": "DUP@example.com"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "CONFLICT"


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "not-an-email", "password": PASSWORD},
        {"email": "a@example.com", "password": "short"},
        {"email": "a@example.com", "password": "x" * 73},
        {"email": "a@example.com", "password": " leading-space-pw"},
        {"email": "a@example.com", "password": "é" * 40},  # 80 bytes, over the bcrypt limit
        {"email": "a@example.com"},
    ],
)
def test_registration_validation(client, payload):
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_wrong_password_and_unknown_email_look_identical(client):
    client.post("/api/v1/auth/register", json={"email": "real@example.com", "password": PASSWORD})
    wrong = client.post("/api/v1/auth/login", json={"email": "real@example.com", "password": "wrong-password"})
    unknown = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "wrong-password"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    assert wrong.headers["www-authenticate"] == "Bearer"


def test_login_throttle_blocks_after_repeated_failures(client):
    client.post("/api/v1/auth/register", json={"email": "t@example.com", "password": PASSWORD})
    for _ in range(MAX_FAILURES):
        assert client.post("/api/v1/auth/login", json={"email": "t@example.com", "password": "bad-password!"}).status_code == 401
    blocked = client.post("/api/v1/auth/login", json={"email": "t@example.com", "password": PASSWORD})
    assert blocked.status_code == 429 and int(blocked.headers["retry-after"]) > 0


def test_successful_login_resets_failure_count(client):
    client.post("/api/v1/auth/register", json={"email": "r@example.com", "password": PASSWORD})
    for _ in range(MAX_FAILURES - 1):
        client.post("/api/v1/auth/login", json={"email": "r@example.com", "password": "bad-password!"})
    assert client.post("/api/v1/auth/login", json={"email": "r@example.com", "password": PASSWORD}).status_code == 200
    for _ in range(MAX_FAILURES - 1):
        assert client.post("/api/v1/auth/login", json={"email": "r@example.com", "password": "bad-password!"}).status_code == 401


def _token(sub: str, **overrides) -> str:
    claims = {"sub": sub, "type": "access", "tv": 0, "exp": datetime.now(timezone.utc) + timedelta(minutes=5), **overrides}
    return jwt.encode(claims, settings.secret_key, algorithm=settings.ALGORITHM)


def test_me_requires_valid_token(client, make_user):
    _, user = make_user()
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    expired = _token(user["id"], exp=datetime.now(timezone.utc) - timedelta(minutes=1))
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401
    forged = jwt.encode({"sub": user["id"], "type": "access"}, "x" * 40, algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401
    wrong_type = _token(user["id"], type="refresh")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {wrong_type}"}).status_code == 401
    unknown_user = _token("00000000-0000-0000-0000-000000000000")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {unknown_user}"}).status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {_token(user['id'])}"}).status_code == 200


def test_unsigned_token_is_rejected(client, make_user):
    _, user = make_user()
    none_token = jwt.encode({"sub": user["id"], "type": "access"}, key=None, algorithm="none")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {none_token}"}).status_code == 401


# ---- password change and account deletion ---------------------------------------------------------
NEW_PASSWORD = "another-strong-passphrase"


def test_change_password_invalidates_old_tokens_and_returns_a_working_one(client, make_user):
    headers, user = make_user("c@example.com")
    r = client.post("/api/v1/auth/change-password", headers=headers, json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})
    assert r.status_code == 200
    new_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401  # old token revoked
    assert client.get("/api/v1/auth/me", headers=new_headers).status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": "c@example.com", "password": PASSWORD}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "c@example.com", "password": NEW_PASSWORD}).status_code == 200


def test_change_password_requires_correct_current_password(client, make_user):
    headers, _ = make_user()
    r = client.post("/api/v1/auth/change-password", headers=headers, json={"current_password": "wrong-password!", "new_password": NEW_PASSWORD})
    assert r.status_code == 401 and r.json()["error"]["message"] == "Incorrect password"
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200  # token still valid


@pytest.mark.parametrize("new_password", ["short", "x" * 73, " leading-space-pw", PASSWORD])
def test_change_password_validates_new_password(client, make_user, new_password):
    headers, _ = make_user()
    r = client.post("/api/v1/auth/change-password", headers=headers, json={"current_password": PASSWORD, "new_password": new_password})
    assert r.status_code in (409, 422)


def test_change_password_requires_authentication(client):
    r = client.post("/api/v1/auth/change-password", json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})
    assert r.status_code == 401


def test_repeated_wrong_current_passwords_are_throttled(client, make_user):
    headers, _ = make_user()
    for _ in range(MAX_FAILURES):
        client.post("/api/v1/auth/change-password", headers=headers, json={"current_password": "wrong-password!", "new_password": NEW_PASSWORD})
    r = client.post("/api/v1/auth/change-password", headers=headers, json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})
    assert r.status_code == 429


def test_delete_account_removes_user_and_all_their_data(client, make_user):
    from sqlalchemy import text

    from app.database.session import engine

    headers, user = make_user("gone@example.com")
    other, _ = make_user("stays@example.com")
    with engine.begin() as c:
        for owner, label in ((user["id"], "mine"), (None, "theirs")):
            uid = owner or c.execute(text("SELECT id FROM users WHERE email='stays@example.com'")).scalar()
            c.execute(
                text("INSERT INTO analyses (id, user_id, text, word_count, classifier_label, probability_unreliable, uncertainty_level, result, created_at) "
                     "VALUES (gen_random_uuid(), :u, :t, 1, 'x', 0.5, 'moderate', '{}'::jsonb, now())"),
                {"u": uid, "t": label},
            )
    r = client.request("DELETE", "/api/v1/auth/me", headers=headers, json={"password": PASSWORD})
    assert r.status_code == 204
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "gone@example.com", "password": PASSWORD}).status_code == 401
    with engine.connect() as c:
        assert c.execute(text("SELECT count(*) FROM analyses WHERE text='mine'")).scalar() == 0
        assert c.execute(text("SELECT count(*) FROM analyses WHERE text='theirs'")).scalar() == 1
    assert client.get("/api/v1/auth/me", headers=other).status_code == 200


def test_delete_account_needs_the_right_password(client, make_user):
    headers, _ = make_user()
    wrong = client.request("DELETE", "/api/v1/auth/me", headers=headers, json={"password": "wrong-password!"})
    assert wrong.status_code == 401
    assert client.request("DELETE", "/api/v1/auth/me", json={"password": PASSWORD}).status_code == 401
    assert client.request("DELETE", "/api/v1/auth/me", headers=headers, json={}).status_code == 422
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
