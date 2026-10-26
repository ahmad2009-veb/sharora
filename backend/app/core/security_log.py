"""Structured security events (one JSON line each) with per-key throttling.

During an attack the same event repeats thousands of times a second; each (event, key) pair
is written at most once per THROTTLE_SECONDS and the next line says how many were skipped.
Never pass passwords, tokens, cookies or request bodies here.
"""

import json
import logging
import sys
import time
from threading import Lock
from typing import Any

THROTTLE_SECONDS = 60.0
# Bounds the throttle table itself when keys are random (spoofed IPs, random usernames).
MAX_TRACKED_KEYS = 10_000

logger = logging.getLogger("app.security")
if not logger.handlers:
    _handler = logging.StreamHandler(sys.stderr)
    _handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

_last: dict[tuple[str, str], tuple[float, int]] = {}
_lock = Lock()


def security_event(event: str, key: str = "", level: int = logging.WARNING, **fields: Any) -> None:
    now = time.monotonic()
    with _lock:
        seen = _last.get((event, key))
        if seen is not None and now - seen[0] < THROTTLE_SECONDS:
            _last[(event, key)] = (seen[0], seen[1] + 1)
            return
        if len(_last) >= MAX_TRACKED_KEYS:
            _last.clear()
        _last[(event, key)] = (now, 0)
    record: dict[str, Any] = {"event": event, **fields}
    if seen is not None and seen[1]:
        record["suppressed"] = seen[1]
    logger.log(level, json.dumps(record, ensure_ascii=False, default=str))


def reset() -> None:
    with _lock:
        _last.clear()
