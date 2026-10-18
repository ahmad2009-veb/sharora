from io import BytesIO
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from starlette.requests import Request

from app.core.config import Settings
from app.routers import public
from app.services import media


def png_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (4, 4), "white").save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgres://u:p@h/db?sslmode=require", "postgresql+psycopg://u:p@h/db?sslmode=require"),
        ("postgresql://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgresql+psycopg://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("sqlite:///./x.db", "sqlite:///./x.db"),
    ],
)
def test_database_url_uses_psycopg(url: str, expected: str) -> None:
    assert Settings(database_url=url).database_url == expected


def test_upload_goes_to_blob_when_token_set(
    admin_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[dict[str, Any]] = []

    def fake_put(url: str, **kwargs: Any) -> httpx.Response:
        calls.append({"url": url, **kwargs})
        blob_url = f"https://store.public.blob.vercel-storage.com/{kwargs['params']['pathname']}"
        return httpx.Response(200, json={"url": blob_url}, request=httpx.Request("PUT", url))

    monkeypatch.setattr(media.settings, "blob_read_write_token", "vercel_blob_rw_test")
    monkeypatch.setattr(media.httpx, "put", fake_put)

    res = admin_client.post(
        "/api/admin/upload?subdir=floors", files={"file": ("p.png", png_bytes(), "image/png")}
    )
    assert res.status_code == 200
    url = res.json()["url"]
    assert url.startswith("https://store.public.blob.vercel-storage.com/floors/")
    assert url.endswith(".png")
    (call,) = calls
    assert call["headers"]["authorization"] == "Bearer vercel_blob_rw_test"
    assert call["headers"]["x-vercel-blob-access"] == "public"
    assert call["headers"]["x-content-type"] == "image/png"


def test_upload_to_blob_with_oidc_store(
    admin_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[dict[str, Any]] = []

    def fake_put(url: str, **kwargs: Any) -> httpx.Response:
        calls.append(kwargs)
        return httpx.Response(
            200,
            json={"url": "https://x.public.blob.vercel-storage.com/units/a.png"},
            request=httpx.Request("PUT", url),
        )

    monkeypatch.setattr(media.settings, "blob_store_id", "store_Abc123")
    monkeypatch.setattr(media.httpx, "put", fake_put)

    res = admin_client.post(
        "/api/admin/upload?subdir=units",
        files={"file": ("p.png", png_bytes(), "image/png")},
        headers={"x-vercel-oidc-token": "oidc-jwt"},
    )
    assert res.status_code == 200
    (call,) = calls
    assert call["headers"]["authorization"] == "Bearer oidc-jwt"
    assert call["headers"]["x-vercel-blob-store-id"] == "Abc123"


def test_upload_on_vercel_without_token_fails_clearly(
    admin_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(media.settings, "vercel", True)
    res = admin_client.post(
        "/api/admin/upload?subdir=floors", files={"file": ("p.png", png_bytes(), "image/png")}
    )
    assert res.status_code == 500
    assert "BLOB_STORE_ID" in res.json()["detail"]


def test_rate_limit_key_uses_forwarded_ip_on_vercel(monkeypatch: pytest.MonkeyPatch) -> None:
    scope = {
        "type": "http",
        "headers": [(b"x-forwarded-for", b"203.0.113.7, 10.0.0.1")],
        "client": ("10.0.0.1", 1234),
    }
    request = Request(scope)
    assert public.client_ip(request) == "10.0.0.1"
    monkeypatch.setattr(public.settings, "vercel", True)
    assert public.client_ip(request) == "203.0.113.7"
