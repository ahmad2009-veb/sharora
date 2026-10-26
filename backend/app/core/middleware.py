"""Plain ASGI middleware (not BaseHTTPMiddleware), so streaming responses pass through untouched.

They run before routing, body parsing and any database work.
"""

from fastapi import HTTPException
from fastapi.responses import JSONResponse
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import get_settings
from app.core.rate_limit import api_limit, client_ip, counter, too_many_requests
from app.core.security import ACCESS_TOKEN_COOKIE_NAME
from app.core.security_log import security_event

settings = get_settings()

RATE_LIMIT_EXEMPT = {"/api/health"}
UPLOAD_PATH = "/api/admin/upload"
BODY_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

API_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
]


class ApiRateLimitMiddleware:
    """One request budget per client IP for the whole /api (RATE_LIMIT_API)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        path = scope.get("path", "")
        if (
            scope["type"] == "http"
            and settings.rate_limit_enabled
            and scope.get("method") != "OPTIONS"
            and path.startswith("/api/")
            and path not in RATE_LIMIT_EXEMPT
        ):
            ip = client_ip(Request(scope))
            retry_after = counter.hit(api_limit(), "api", ip)
            if retry_after is not None:
                security_event("rate_limited", key=ip, scope="api", ip=ip, path=path)
                await too_many_requests(retry_after)(scope, receive, send)
                return
        await self.app(scope, receive, send)


class BodyTooLarge(HTTPException):
    def __init__(self, limit: int) -> None:
        super().__init__(status_code=413, detail=f"Запрос больше {limit // 1024} КБ")


class BodySizeLimitMiddleware:
    """Refuses oversized bodies by Content-Length up front, and by counting streamed chunks.

    Only signed-in admins get the upload allowance, so an anonymous client cannot make the
    server receive and parse a multi-megabyte multipart body before authentication fails.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    @staticmethod
    def limit_for(scope: Scope) -> int:
        if scope.get("path") == UPLOAD_PATH and ACCESS_TOKEN_COOKIE_NAME in Request(scope).cookies:
            return settings.max_upload_mb * 1024 * 1024 + 64 * 1024  # file + multipart framing
        return settings.max_request_body_kb * 1024

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("method") not in BODY_METHODS:
            await self.app(scope, receive, send)
            return

        limit = self.limit_for(scope)
        declared = Request(scope).headers.get("content-length")
        if declared is not None and (not declared.isdigit() or int(declared) > limit):
            await self._refuse(scope, receive, send, limit)
            return

        received = 0
        started = False

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    # An HTTPException, so FastAPI's body parsing turns it into a 413 too.
                    raise BodyTooLarge(limit)
            return message

        async def tracking_send(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracking_send)
        except BodyTooLarge:
            if started:
                raise
            await self._refuse(scope, receive, send, limit)

    @staticmethod
    async def _refuse(scope: Scope, receive: Receive, send: Send, limit: int) -> None:
        ip = client_ip(Request(scope))
        security_event("body_too_large", key=ip, ip=ip, path=scope.get("path"), limit=limit)
        exc = BodyTooLarge(limit)
        response = JSONResponse(status_code=413, content={"detail": exc.detail})
        response.headers["Connection"] = "close"
        await response(scope, receive, send)


class SecurityHeadersMiddleware:
    """nosniff / no framing / no referrer on every API and media response."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                present = {name.lower() for name, _ in headers}
                headers.extend(h for h in API_HEADERS if h[0] not in present)
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
