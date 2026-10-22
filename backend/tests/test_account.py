"""«Мой аккаунт»: changing the login and password, and signing out other sessions."""

from pathlib import Path

import bcrypt
import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient

from app.core import database
from app.core.security import ACCESS_TOKEN_COOKIE_NAME
from app.main import app, ensure_bootstrap_data
from app.models import AdminUser
from tests.test_restructure import alembic

PASSWORD = "test-password"


def login(client: TestClient, username: str = "admin", password: str = PASSWORD) -> int:
    return client.post(
        "/api/admin/login", json={"username": username, "password": password}
    ).status_code


def second_session() -> TestClient:
    other = TestClient(app)
    assert login(other) == 200
    return other


def test_unauthenticated_requests_are_rejected(client: TestClient) -> None:
    assert client.get("/api/admin/me").status_code == 401
    body = {"new_username": "boss", "current_password": PASSWORD}
    assert client.patch("/api/admin/me/username", json=body).status_code == 401
    body = {"current_password": PASSWORD, "new_password": "NewPass123"}
    assert client.patch("/api/admin/me/password", json=body).status_code == 401
    assert client.post("/api/admin/me/logout-all").status_code == 401


def test_me_returns_account_data_without_the_hash(admin_client: TestClient) -> None:
    me = admin_client.get("/api/admin/me").json()
    assert set(me) == {"id", "username", "created_at", "last_login_at"}
    assert me["username"] == "admin"
    assert me["last_login_at"].endswith(("Z", "+00:00"))


def test_change_username(admin_client: TestClient) -> None:
    res = admin_client.patch(
        "/api/admin/me/username", json={"new_username": "sales.lead", "current_password": PASSWORD}
    )
    assert res.status_code == 200
    assert res.json()["username"] == "sales.lead"
    # The session is tied to the admin id, so it survives the rename.
    assert admin_client.get("/api/admin/me").json()["username"] == "sales.lead"
    fresh = TestClient(app)
    assert login(fresh, "admin") == 401
    assert login(fresh, "sales.lead") == 200


def test_change_username_wrong_password(admin_client: TestClient) -> None:
    res = admin_client.patch(
        "/api/admin/me/username", json={"new_username": "boss", "current_password": "wrong-pass1"}
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Неверный текущий пароль"
    assert admin_client.get("/api/admin/me").json()["username"] == "admin"


@pytest.mark.parametrize("name", ["ab", "a" * 33, "имя", "with space", "semi;colon"])
def test_change_username_invalid(admin_client: TestClient, name: str) -> None:
    res = admin_client.patch(
        "/api/admin/me/username", json={"new_username": name, "current_password": PASSWORD}
    )
    assert res.status_code == 422


def test_change_username_duplicate(admin_client: TestClient) -> None:
    with database.SessionLocal() as db:
        db.add(AdminUser(username="Manager", password_hash="x"))
        db.commit()
    res = admin_client.patch(
        "/api/admin/me/username", json={"new_username": "manager", "current_password": PASSWORD}
    )
    assert res.status_code == 409
    assert res.json()["detail"] == "Такой логин уже занят"


@pytest.mark.parametrize("weak", ["short1", "onlyletters", "1234567890"])
def test_change_password_weak(admin_client: TestClient, weak: str) -> None:
    res = admin_client.patch(
        "/api/admin/me/password", json={"current_password": PASSWORD, "new_password": weak}
    )
    assert res.status_code == 422
    assert login(TestClient(app)) == 200


def test_change_password_same_as_current(admin_client: TestClient) -> None:
    with database.SessionLocal() as db:
        admin = db.query(AdminUser).one()
        admin.password_hash = bcrypt.hashpw(b"Same-pass1", bcrypt.gensalt()).decode()
        db.commit()
    res = admin_client.patch(
        "/api/admin/me/password",
        json={"current_password": "Same-pass1", "new_password": "Same-pass1"},
    )
    assert res.status_code == 422


def test_change_password_wrong_current(admin_client: TestClient) -> None:
    res = admin_client.patch(
        "/api/admin/me/password",
        json={"current_password": "nope-nope1", "new_password": "NewPass123"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Неверный текущий пароль"
    assert login(TestClient(app)) == 200


def test_change_password_signs_out_other_sessions(admin_client: TestClient) -> None:
    other = second_session()
    old_cookie = admin_client.cookies[ACCESS_TOKEN_COOKIE_NAME]
    res = admin_client.patch(
        "/api/admin/me/password", json={"current_password": PASSWORD, "new_password": "NewPass123"}
    )
    assert res.status_code == 200
    # This browser got a fresh cookie and stays signed in …
    assert admin_client.cookies[ACCESS_TOKEN_COOKIE_NAME] != old_cookie
    assert admin_client.get("/api/admin/me").status_code == 200
    # … while the other session and the old token no longer work.
    assert other.get("/api/admin/me").status_code == 401
    stale = TestClient(app, cookies={ACCESS_TOKEN_COOKIE_NAME: old_cookie})
    assert stale.get("/api/admin/me").status_code == 401
    fresh = TestClient(app)
    assert login(fresh, password=PASSWORD) == 401
    assert login(fresh, password="NewPass123") == 200


def test_logout_all_keeps_only_this_session(admin_client: TestClient) -> None:
    other = second_session()
    assert admin_client.post("/api/admin/me/logout-all").status_code == 200
    assert admin_client.get("/api/admin/me").status_code == 200
    assert other.get("/api/admin/me").status_code == 401


def test_wrong_password_attempts_are_limited(admin_client: TestClient) -> None:
    body = {"current_password": "wrong-pass1", "new_password": "NewPass123"}
    for _ in range(5):
        assert admin_client.patch("/api/admin/me/password", json=body).status_code == 400
    # Blocked even with the right password now.
    body["current_password"] = PASSWORD
    assert admin_client.patch("/api/admin/me/password", json=body).status_code == 429
    rename = {"new_username": "boss", "current_password": PASSWORD}
    assert admin_client.patch("/api/admin/me/username", json=rename).status_code == 429


def test_token_without_version_is_rejected(client: TestClient) -> None:
    import jwt

    from app.core.config import get_settings

    cfg = get_settings()
    legacy = jwt.encode({"sub": "admin", "exp": 9999999999}, cfg.jwt_secret, cfg.jwt_algorithm)
    client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, legacy)
    assert client.get("/api/admin/me").status_code == 401


def test_startup_does_not_recreate_a_renamed_admin(admin_client: TestClient) -> None:
    admin_client.patch(
        "/api/admin/me/username", json={"new_username": "boss", "current_password": PASSWORD}
    )
    ensure_bootstrap_data()
    with database.SessionLocal() as db:
        assert [a.username for a in db.query(AdminUser)] == ["boss"]


def test_migration_keeps_the_existing_admin(tmp_path: Path) -> None:
    url = f"sqlite:///{tmp_path / 'old.db'}"
    alembic(url, "upgrade", "0005")
    password_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    engine = sa.create_engine(url)
    with engine.begin() as conn:
        conn.execute(
            sa.text("INSERT INTO admin_users (username, password_hash) VALUES ('admin', :h)"),
            {"h": password_hash},
        )
    alembic(url, "upgrade", "head")
    with engine.connect() as conn:
        row = conn.execute(
            sa.text("SELECT username, password_hash, token_version, last_login_at FROM admin_users")
        ).one()
    assert tuple(row) == ("admin", password_hash, 0, None)
