import re
from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel

USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,32}$")
PASSWORD_MIN_LENGTH = 8
# bcrypt only looks at the first 72 bytes and the library rejects longer input.
PASSWORD_MAX_BYTES = 72


class LoginRequest(ORMModel):
    username: str
    password: str


class TokenOut(ORMModel):
    access_token: str
    token_type: str = "bearer"


class AdminMeOut(ORMModel):
    id: int
    username: str
    created_at: datetime
    last_login_at: datetime | None

    @field_validator("created_at", "last_login_at")
    @classmethod
    def as_utc(cls, value: datetime | None) -> datetime | None:
        # Stored naive in UTC; say so, or browsers read the time as local.
        return value.replace(tzinfo=UTC) if value and value.tzinfo is None else value


class UsernameChange(BaseModel):
    new_username: str
    current_password: str = Field(min_length=1, max_length=200)

    @field_validator("new_username")
    @classmethod
    def check_username(cls, value: str) -> str:
        value = value.strip()
        if not USERNAME_RE.match(value):
            raise ValueError(
                "Логин: 3–32 символа — латинские буквы, цифры, точка, подчёркивание или дефис"
            )
        return value


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_strength(cls, value: str) -> str:
        if len(value) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"Пароль должен быть не короче {PASSWORD_MIN_LENGTH} символов")
        if len(value.encode("utf-8")) > PASSWORD_MAX_BYTES:
            raise ValueError("Пароль слишком длинный")
        if not any(ch.isalpha() for ch in value) or not any(ch.isdigit() for ch in value):
            raise ValueError("Пароль должен содержать хотя бы одну букву и одну цифру")
        return value
