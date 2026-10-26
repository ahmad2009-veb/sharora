"""Client identity and request counting shared by the middleware and endpoint limits."""

import ipaddress
import math
import time
from functools import lru_cache

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from limits import RateLimitItem, parse
from limits.storage import MemoryStorage, storage_from_string
from limits.strategies import FixedWindowRateLimiter
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.security_log import security_event

settings = get_settings()

TOO_MANY_REQUESTS = "Слишком много запросов, попробуйте позже"
KEY_PREFIX = "sharora-api"


def _ip(value: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address | None:
    try:
        ip = ipaddress.ip_address(value.strip())
    except ValueError:
        return None
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        return ip.ipv4_mapped
    return ip


def _is_trusted(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return any(ip in net for net in settings.trusted_proxies)


def client_ip(request: Request) -> str:
    """The address rate limits and lockouts are counted against.

    X-Forwarded-For is client-controlled: it is only read when the socket peer is a trusted
    proxy, and then from the right, skipping trusted hops — entries an attacker prepends sit
    to the left of the address our own proxy appended and are never reached.
    """
    peer = request.client.host if request.client else ""
    forwarded = request.headers.get("x-forwarded-for", "")
    if settings.vercel:
        # Vercel's edge replaces X-Forwarded-For with the real client address; the socket
        # peer is Vercel's own infrastructure, shared by everyone.
        first = forwarded.split(",")[0].strip()
        return first or peer or "unknown"
    peer_ip = _ip(peer)
    if peer_ip is None or not _is_trusted(peer_ip):
        return peer or "unknown"
    hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
    for hop in reversed(hops):
        hop_ip = _ip(hop)
        if hop_ip is None:
            break  # malformed chain: stop believing it at the first garbage entry
        if not _is_trusted(hop_ip):
            return str(hop_ip)
    return peer


def too_many_requests(retry_after: int, detail: str = TOO_MANY_REQUESTS) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": detail},
        headers={"Retry-After": str(max(1, retry_after))},
    )


def rate_limited(retry_after: int, detail: str = TOO_MANY_REQUESTS) -> HTTPException:
    """The same 429 as too_many_requests(), raised from inside an endpoint."""
    return HTTPException(
        status_code=429, detail=detail, headers={"Retry-After": str(max(1, retry_after))}
    )


class RequestCounter:
    """Fixed-window counters in RATE_LIMIT_STORAGE_URI, with process memory as the fallback.

    A storage outage is logged and counting continues in memory, so an attacker who can
    knock Redis over does not switch rate limiting off; the next hit retries Redis.
    """

    def __init__(self, storage_uri: str) -> None:
        self._primary = FixedWindowRateLimiter(storage_from_string(storage_uri))
        self._shared = not storage_uri.startswith("memory://")
        self._fallback = FixedWindowRateLimiter(MemoryStorage()) if self._shared else None

    def hit(self, limit: RateLimitItem, *identifiers: str) -> int | None:
        """Counts one request; returns seconds to wait when over the limit, else None."""
        try:
            return self._hit(self._primary, limit, identifiers)
        except Exception as exc:  # any storage/client error: redis, timeouts, …
            if self._fallback is None:
                raise
            security_event("rate_limit_storage_down", error=type(exc).__name__)
            return self._hit(self._fallback, limit, identifiers)

    @staticmethod
    def _hit(
        strategy: FixedWindowRateLimiter, limit: RateLimitItem, identifiers: tuple[str, ...]
    ) -> int | None:
        if strategy.hit(limit, KEY_PREFIX, *identifiers):
            return None
        reset_at = strategy.get_window_stats(limit, KEY_PREFIX, *identifiers).reset_time
        return math.ceil(reset_at - time.time())

    def reset(self) -> None:
        for strategy in (self._primary, self._fallback):
            if strategy is not None:
                strategy.storage.reset()


@lru_cache
def api_limit() -> RateLimitItem:
    return parse(settings.rate_limit_api)


counter = RequestCounter(settings.rate_limit_storage_uri)

# Endpoint-specific limits (@limiter.limit) — same key, same storage, same fallback rule.
limiter = Limiter(
    key_func=client_ip,
    storage_uri=settings.rate_limit_storage_uri,
    in_memory_fallback_enabled=True,
    enabled=settings.rate_limit_enabled,
    key_prefix=KEY_PREFIX,
)


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = 60
    current = getattr(request.state, "view_rate_limit", None)
    if current is not None:
        reset_at, _ = request.app.state.limiter.limiter.get_window_stats(current[0], *current[1])
        retry_after = math.ceil(reset_at - time.time())
    security_event(
        "rate_limited",
        key=f"{client_ip(request)}:{request.url.path}",
        scope="endpoint",
        ip=client_ip(request),
        path=request.url.path,
        limit=str(exc.limit.limit) if exc.limit else None,
    )
    return too_many_requests(retry_after)
