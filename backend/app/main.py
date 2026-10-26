from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlalchemy import inspect

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.middleware import (
    ApiRateLimitMiddleware,
    BodySizeLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.rate_limit import limiter, rate_limit_handler
from app.core.security import hash_password
from app.models import AdminUser, CalculatorSettings
from app.routers.admin import router as admin_router
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
    # Off on Vercel by default (DOCS_ENABLED): the schema maps every admin endpoint.
    docs_url="/docs" if settings.docs_on else None,
    redoc_url="/redoc" if settings.docs_on else None,
    openapi_url="/openapi.json" if settings.docs_on else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)  # type: ignore[arg-type]

# Last added runs first: CORS → security headers → per-IP API budget → body size → routes.
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(ApiRateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
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


@app.get("/", include_in_schema=False, response_model=None)
def root() -> RedirectResponse | JSONResponse:
    # The API has no page of its own; opening the backend address shows its docs.
    if settings.docs_on:
        return RedirectResponse("/docs")
    return JSONResponse(status_code=404, content={"detail": "Not Found"})


@app.get("/api/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
