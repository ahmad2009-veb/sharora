from functools import lru_cache
from pathlib import Path

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
    # When set, uploads go to Vercel Blob and the public Blob URL is stored in the DB.
    blob_read_write_token: str = ""

    # Only needed where the first admin is created (local/Docker startup, seed.py).
    default_admin_username: str = "admin"
    default_admin_password: str = ""

    # Vercel sets VERCEL=1: serverless mode (no startup bootstrap, no local writes, NullPool).
    vercel: bool = False

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

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")

    def require_admin_password(self) -> str:
        if len(self.default_admin_password) < 8:
            raise RuntimeError("Set DEFAULT_ADMIN_PASSWORD (at least 8 characters) in backend/.env")
        return self.default_admin_password


@lru_cache
def get_settings() -> Settings:
    return Settings()
