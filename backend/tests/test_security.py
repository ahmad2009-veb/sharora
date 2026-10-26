"""Abuse protection: per-IP API budget, lockouts, body limits, client IP, headers, config."""

import logging
from collections.abc import Iterator
from io import BytesIO
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from limits import parse
from limits.storage import MemoryStorage
from limits.strategies import FixedWindowRateLimiter
from PIL import Image
from pydantic import ValidationError
from starlette.requests import Request

from app.core import middleware, rate_limit
from app.core.config import Settings
from app.core.rate_limit import RequestCounter, client_ip, limiter
from app.core.security_log import logger as security_logger
from app.main import app
from app.services import media

GOOD_LOGIN = {"username": "admin", "password": "test-password"}
BAD_LOGIN = {"username": "admin", "password": "wrong-password"}
LEAD = {"name": "Иван", "phone": "+992 90 123 45 67"}


def client_from(ip: str) -> TestClient:
    return TestClient(app, client=(ip, 50000))


@pytest.fixture
def small_api_budget(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(middleware, "api_limit", lambda: parse("3/minute"))


@pytest.fixture
def security_logs() -> Iterator[list[str]]:
    lines: list[str] = []

    class Collect(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            lines.append(record.getMessage())

    handler = Collect()
    security_logger.addHandler(handler)
    yield lines
    security_logger.removeHandler(handler)


def request_from(peer: str, forwarded: str | None = None) -> Request:
    headers = [(b"x-forwarded-for", forwarded.encode())] if forwarded is not None else []
    return Request({"type": "http", "headers": headers, "client": (peer, 1234)})


# ---------- per-IP API budget ----------


@pytest.mark.usefixtures("small_api_budget")
def test_requests_below_the_limit_pass_then_429(security_logs: list[str]) -> None:
    c = client_from("198.51.100.1")
    for _ in range(3):
        assert c.get("/api/stats").status_code == 200
    res = c.get("/api/stats")
    assert res.status_code == 429
    assert res.json() == {"detail": rate_limit.TOO_MANY_REQUESTS}
    assert 1 <= int(res.headers["retry-after"]) <= 60
    assert any('"event": "rate_limited"' in line for line in security_logs)


@pytest.mark.usefixtures("small_api_budget")
def test_health_is_not_counted() -> None:
    c = client_from("198.51.100.2")
    for _ in range(5):
        assert c.get("/api/health").status_code == 200


@pytest.mark.usefixtures("small_api_budget")
def test_clients_are_counted_independently() -> None:
    a, b = client_from("198.51.100.3"), client_from("198.51.100.4")
    for _ in range(3):
        a.get("/api/stats")
    assert a.get("/api/stats").status_code == 429
    assert b.get("/api/stats").status_code == 200


@pytest.mark.usefixtures("small_api_budget")
def test_spoofed_forwarded_for_from_untrusted_peer_does_not_reset_the_budget() -> None:
    c = client_from("198.51.100.5")
    for i in range(3):
        c.get("/api/stats", headers={"x-forwarded-for": f"203.0.113.{i}"})
    res = c.get("/api/stats", headers={"x-forwarded-for": "203.0.113.99"})
    assert res.status_code == 429


@pytest.mark.usefixtures("small_api_budget")
def test_log_lines_are_throttled(security_logs: list[str]) -> None:
    c = client_from("198.51.100.6")
    for _ in range(20):
        c.get("/api/stats")
    assert sum('"rate_limited"' in line for line in security_logs) == 1


def test_disabled_rate_limit_lets_everything_through(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(middleware, "api_limit", lambda: parse("1/minute"))
    monkeypatch.setattr(middleware.settings, "rate_limit_enabled", False)
    c = client_from("198.51.100.7")
    assert all(c.get("/api/stats").status_code == 200 for _ in range(3))


# ---------- client IP ----------


@pytest.mark.parametrize(
    ("peer", "forwarded", "expected"),
    [
        # Untrusted peer: its header is ignored entirely.
        ("198.51.100.9", "203.0.113.7", "198.51.100.9"),
        # Trusted local proxy (the Next.js rewrite) appended the real client.
        ("127.0.0.1", "203.0.113.7", "203.0.113.7"),
        # A client-prepended fake sits left of what our proxy appended: never reached.
        ("127.0.0.1", "1.2.3.4, 203.0.113.7", "203.0.113.7"),
        # Trusted hops on the right are skipped.
        ("127.0.0.1", "203.0.113.7, 127.0.0.1", "203.0.113.7"),
        # Garbage stops the walk; the trusted peer itself is the identity.
        ("127.0.0.1", "203.0.113.7, not-an-ip", "127.0.0.1"),
        ("::ffff:127.0.0.1", "203.0.113.8", "203.0.113.8"),
        ("127.0.0.1", None, "127.0.0.1"),
    ],
)
def test_client_ip(peer: str, forwarded: str | None, expected: str) -> None:
    assert client_ip(request_from(peer, forwarded)) == expected


def test_trusted_proxy_cidrs_are_configurable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rate_limit.settings, "trusted_proxy_cidrs", "10.30.0.0/24")
    assert client_ip(request_from("10.30.0.10", "203.0.113.7")) == "203.0.113.7"
    assert client_ip(request_from("127.0.0.1", "203.0.113.7")) == "127.0.0.1"


# ---------- sign-in lockout ----------


def test_login_locks_out_after_ten_failures_even_with_the_right_password() -> None:
    c = client_from("198.51.100.10")
    for _ in range(10):
        assert c.post("/api/admin/login", json=BAD_LOGIN).status_code == 401
    limiter.reset()  # the lockout lives in the database, not in the per-process limiter
    res = c.post("/api/admin/login", json=GOOD_LOGIN)
    assert res.status_code == 429
    assert "попыток входа" in res.json()["detail"]
    assert int(res.headers["retry-after"]) > 0
    # Another address can still sign in.
    assert client_from("198.51.100.11").post("/api/admin/login", json=GOOD_LOGIN).status_code == 200


def test_login_lockout_counts_unknown_usernames_per_ip() -> None:
    c = client_from("198.51.100.12")
    for i in range(10):
        c.post("/api/admin/login", json={"username": f"guess{i}", "password": "x"})
    limiter.reset()
    assert c.post("/api/admin/login", json=GOOD_LOGIN).status_code == 429


def test_login_burst_limit_per_ip() -> None:
    c = client_from("198.51.100.13")
    codes = [c.post("/api/admin/login", json=GOOD_LOGIN).status_code for _ in range(11)]
    assert codes[:10] == [200] * 10 and codes[10] == 429


def test_login_rejects_oversized_fields() -> None:
    res = client_from("198.51.100.14").post(
        "/api/admin/login", json={"username": "a" * 65, "password": "x"}
    )
    assert res.status_code == 422


def test_failed_login_is_logged_without_the_password(security_logs: list[str]) -> None:
    client_from("198.51.100.15").post("/api/admin/login", json=BAD_LOGIN)
    joined = "\n".join(security_logs)
    assert '"login_failed"' in joined and "wrong-password" not in joined


# ---------- leads ----------


def test_leads_are_limited_per_ip_across_instances() -> None:
    c = client_from("198.51.100.20")
    for i in range(20):
        if i % 5 == 0:
            limiter.reset()  # stay under the 5/minute burst limit
        assert c.post("/api/leads", json=LEAD).status_code == 201
    limiter.reset()
    res = c.post("/api/leads", json=LEAD)
    assert res.status_code == 429 and "retry-after" in res.headers
    assert client_from("198.51.100.21").post("/api/leads", json=LEAD).status_code == 201


# ---------- request bodies ----------


def test_oversized_json_body_is_refused() -> None:
    body = {**LEAD, "message": "x" * (70 * 1024)}
    res = client_from("198.51.100.30").post("/api/leads", json=body)
    assert res.status_code == 413
    assert res.json()["detail"].startswith("Запрос больше")


def test_streamed_body_without_content_length_is_refused() -> None:
    def chunks() -> Iterator[bytes]:
        for _ in range(100):
            yield b"x" * 1024

    res = client_from("198.51.100.31").post(
        "/api/leads", content=chunks(), headers={"content-type": "application/json"}
    )
    assert res.status_code == 413


def test_invalid_content_length_is_refused() -> None:
    res = client_from("198.51.100.32").post(
        "/api/leads", content=b"{}", headers={"content-length": "abc"}
    )
    assert res.status_code == 413


def test_anonymous_upload_gets_no_upload_allowance() -> None:
    files = {"file": ("x.png", b"0" * (200 * 1024), "image/png")}
    res = client_from("198.51.100.33").post("/api/admin/upload", files=files)
    assert res.status_code == 413


def test_admin_upload_keeps_its_allowance(
    admin_client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(media.settings, "media_dir", str(tmp_path))
    files = {"file": ("x.png", _png(64, 64, pad=200 * 1024), "image/png")}
    res = admin_client.post("/api/admin/upload?subdir=units", files=files)
    assert res.status_code == 200, res.text


def test_upload_with_a_huge_canvas_is_refused(admin_client: TestClient) -> None:
    files = {"file": ("x.png", _png(8000, 6000), "image/png")}
    res = admin_client.post("/api/admin/upload?subdir=units", files=files)
    assert res.status_code == 400
    assert "разрешение" in res.json()["detail"]


def _png(width: int, height: int, pad: int = 0) -> bytes:
    buf = BytesIO()
    Image.new("1", (width, height)).save(buf, format="PNG")
    return buf.getvalue() + b"\0" * pad  # trailing bytes after IEND are ignored by readers


# ---------- headers, docs, config ----------


def test_api_responses_carry_security_headers(client: TestClient) -> None:
    res = client.get("/api/stats")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "no-referrer"


def _settings(**overrides: Any) -> Settings:
    return Settings(jwt_secret="x" * 32, **overrides)


def test_docs_default_off_on_vercel_only() -> None:
    assert _settings().docs_on is True
    assert _settings(vercel=True).docs_on is False
    assert _settings(vercel=True, docs_enabled=True).docs_on is True


def test_cookies_are_secure_on_vercel() -> None:
    assert _settings().secure_cookies is False
    assert _settings(vercel=True).secure_cookies is True


@pytest.mark.parametrize(
    "overrides",
    [
        {"cors_origins": "*"},
        {"cors_origins": "http://localhost:3000,*"},
        {"rate_limit_api": "lots"},
        {"trusted_proxy_cidrs": "10.0.0.0/33"},
        {"max_request_body_kb": 0},
    ],
)
def test_invalid_security_config_fails_at_startup(overrides: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        _settings(**overrides)


# ---------- shared storage outage ----------


class BrokenStorageLimiter(FixedWindowRateLimiter):
    def hit(self, *args: Any, **kwargs: Any) -> bool:
        raise ConnectionError("redis is down")


def test_storage_outage_falls_back_to_memory_instead_of_switching_off(
    security_logs: list[str],
) -> None:
    counter = RequestCounter("memory://")
    counter._primary = BrokenStorageLimiter(MemoryStorage())
    counter._fallback = FixedWindowRateLimiter(MemoryStorage())
    limit = parse("2/minute")
    assert counter.hit(limit, "api", "198.51.100.40") is None
    assert counter.hit(limit, "api", "198.51.100.40") is None
    assert counter.hit(limit, "api", "198.51.100.40") is not None
    assert any('"rate_limit_storage_down"' in line for line in security_logs)
