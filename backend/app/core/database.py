from collections.abc import Generator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

engine_kwargs: dict[str, Any] = {}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    if settings.is_postgres:
        # Server-side prepared statements break behind PgBouncer-style poolers (Neon pooled URL).
        engine_kwargs["connect_args"] = {"prepare_threshold": None}
    if settings.vercel:
        # Serverless instances come and go: let the provider's pooler keep connections.
        engine_kwargs["poolclass"] = NullPool
    else:
        engine_kwargs.update(pool_size=5, max_overflow=5, pool_recycle=300)

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
