import ipaddress
from functools import lru_cache
from pathlib import Path

from limits import parse
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./sharora.db"

    # Secrets have no defaults: set them in backend/.env (see .env.example).
    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    cookie_secure: bool = False

    cors_origins: str = "http://localhost:3000"

    media_dir: str = "./media"
    media_url: str = "/media"
    max_upload_mb: int = 10
    # Vercel Blob: a read-write token, or OIDC (BLOB_STORE_ID + the per-request OIDC token) as
    # set up by newer Blob stores. Either one sends uploads to Blob; the Blob URL goes to the DB.
    blob_read_write_token: str = ""
    blob_store_id: str = ""
    vercel_oidc_token: str = ""

    # Only needed where the first admin is created (local/Docker startup, seed.py).
    default_admin_username: str = "admin"
    default_admin_password: str = ""

    # Vercel sets VERCEL=1: serverless mode (no startup bootstrap, no local writes, NullPool).
    vercel: bool = False

    # Swagger UI, ReDoc and /openapi.json. Unset = on locally, off on Vercel.
    docs_enabled: bool | None = None

    # ---- abuse protection (see SECURITY.md) ----
    rate_limit_enabled: bool = True
    # Where request counters live. memory:// counts per process (per Vercel instance);
    # redis://… shares them between instances (needs the `redis` package). If Redis fails,
    # counting falls back to process memory — limits never switch off.
    rate_limit_storage_uri: str = "memory://"
    # Every /api request per client IP (except /api/health); endpoint limits come on top.
    rate_limit_api: str = "300/minute"
    # Peers whose X-Forwarded-For is believed (the Next.js proxy / nginx). Ignored on Vercel,
    # whose edge overwrites X-Forwarded-For itself.
    trusted_proxy_cidrs: str = "127.0.0.1/32,::1/128"
    # Request bodies above this are refused (413) while being received; uploads get
    # MAX_UPLOAD_MB instead.
    max_request_body_kb: int = Field(default=64, ge=1, le=1024)

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        # Neon / Vercel Postgres hand out postgres:// or postgresql:// URLs; we ship psycopg 3.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url

    @field_validator("media_dir")
    @classmethod
    def resolve_media_dir(cls, path: str) -> str:
        # Relative to backend/, not to the process cwd (which differs on Vercel).
        return str(BACKEND_ROOT / path) if not Path(path).is_absolute() else path

    @field_validator("cors_origins")
    @classmethod
    def no_wildcard_origin(cls, origins: str) -> str:
        # The admin cookie is sent with credentials: a wildcard would let any site use it.
        if "*" in origins:
            raise ValueError("CORS_ORIGINS must list exact origins, not *")
        return origins

    @field_validator("rate_limit_api")
    @classmethod
    def valid_rate_limit(cls, value: str) -> str:
        parse(value)  # e.g. "300/minute"; raises on a typo instead of silently not limiting
        return value

    @field_validator("trusted_proxy_cidrs")
    @classmethod
    def valid_cidrs(cls, value: str) -> str:
        for cidr in value.split(","):
            if cidr.strip():
                ipaddress.ip_network(cidr.strip(), strict=False)
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def trusted_proxies(self) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
        cidrs = (c.strip() for c in self.trusted_proxy_cidrs.split(","))
        return [ipaddress.ip_network(c, strict=False) for c in cidrs if c]

    @property
    def docs_on(self) -> bool:
        return not self.vercel if self.docs_enabled is None else self.docs_enabled

    @property
    def secure_cookies(self) -> bool:
        # Vercel serves only HTTPS, so the cookie is Secure there whatever COOKIE_SECURE says.
        return self.cookie_secure or self.vercel

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")

    @property
    def uses_blob(self) -> bool:
        return bool(self.blob_read_write_token or self.blob_store_id)

    def require_admin_password(self) -> str:
        if len(self.default_admin_password) < 8:
            raise RuntimeError("Set DEFAULT_ADMIN_PASSWORD (at least 8 characters) in backend/.env")
        return self.default_admin_password


@lru_cache
def get_settings() -> Settings:
    return Settings()
