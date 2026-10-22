from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlalchemy import inspect

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models import AdminUser, CalculatorSettings
from app.routers.admin import router as admin_router
from app.routers.public import limiter
from app.routers.public import router as public_router
from app.services.media import ensure_media_dirs

settings = get_settings()


def ensure_bootstrap_data() -> None:
    """Creates the settings row and, while there is no admin at all, the default admin."""
    if not inspect(engine).has_table("admin_users"):
        return
    with SessionLocal() as db:
        if db.get(CalculatorSettings, 1) is None:
            db.add(CalculatorSettings(id=1))
        # Only on an empty table: the admin may have renamed themselves since.
        if db.query(AdminUser.id).first() is None:
            db.add(
                AdminUser(
                    username=settings.default_admin_username,
                    password_hash=hash_password(settings.require_admin_password()),
                )
            )
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # On Vercel the schema, admin and data are created once from a workstation (see README).
    if not settings.vercel:
        ensure_bootstrap_data()
    yield


app = FastAPI(
    title="Zarafshon API",
    version="1.0.0",
    description="API выбора квартир ЖК «Зарафшон» и админ-панели менеджеров.",
    lifespan=lifespan,
)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429, content={"detail": "Слишком много запросов, попробуйте позже"}
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

ensure_media_dirs()
app.mount(settings.media_url, StaticFiles(directory=settings.media_dir), name="media")

app.include_router(public_router)
app.include_router(admin_router)


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    # The API has no page of its own; opening the backend address shows its docs.
    return RedirectResponse("/docs")


@app.get("/api/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
