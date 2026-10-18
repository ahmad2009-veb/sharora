from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    default_admin_username: str = "admin"
    default_admin_password: str = Field(min_length=8)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
