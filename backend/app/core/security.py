from datetime import UTC, datetime, timedelta
from typing import Any, NamedTuple

import bcrypt
import jwt

from app.core.config import get_settings

settings = get_settings()

ACCESS_TOKEN_COOKIE_NAME = "sharora_admin_token"


class TokenClaims(NamedTuple):
    admin_id: int
    version: int


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# Hash of a random throwaway password: lets unknown usernames cost one bcrypt check too.
_DUMMY_HASH = bcrypt.hashpw(b"timing-equaliser-not-a-password", bcrypt.gensalt()).decode("utf-8")


def verify_password_or_dummy(password: str, password_hash: str | None) -> bool:
    """verify_password() that takes the same time when there is no such user."""
    if password_hash is None:
        verify_password(password, _DUMMY_HASH)
        return False
    return verify_password(password, password_hash)


def create_access_token(admin_id: int, version: int) -> str:
    """The subject is the admin id (not the username, which can change) plus the token version."""
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": str(admin_id), "ver": version, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> TokenClaims | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    subject, version = payload.get("sub"), payload.get("ver")
    # Tokens issued before versioning carried the username and no "ver": rejected.
    if not isinstance(subject, str) or not subject.isdigit() or type(version) is not int:
        return None
    return TokenClaims(int(subject), version)
