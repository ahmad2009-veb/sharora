"""Wrong current-password attempts on the «Мой аккаунт» endpoints.

At most MAX_FAILURES per WINDOW, counted separately per admin and per client IP. Kept in
process memory like the slowapi limiter, so on Vercel each warm instance counts on its own.
"""

import time
from collections import defaultdict, deque
from threading import Lock

MAX_FAILURES = 5
WINDOW_SECONDS = 15 * 60

_failures: defaultdict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def _recent(key: str, now: float) -> deque[float]:
    hits = _failures[key]
    while hits and hits[0] <= now - WINDOW_SECONDS:
        hits.popleft()
    return hits


def is_blocked(keys: list[str]) -> bool:
    now = time.monotonic()
    with _lock:
        return any(len(_recent(key, now)) >= MAX_FAILURES for key in keys)


def record_failure(keys: list[str]) -> None:
    now = time.monotonic()
    with _lock:
        for key in keys:
            _recent(key, now).append(now)


def reset() -> None:
    with _lock:
        _failures.clear()
