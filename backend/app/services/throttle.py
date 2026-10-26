"""Sliding-window attempt limits stored in the database (ThrottleEvent).

Used where in-process counters are not enough: sign-in, the current-password check on the
«Мой аккаунт» endpoints and lead submissions. Every API instance shares the counts, and if
the database is down these endpoints cannot work anyway — so the limits fail closed.
Checks happen before bcrypt or any other expensive work.
"""

import math
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import ThrottleEvent

# Older rows are never needed: no rule looks further back.
RETENTION = timedelta(days=1)
KEY_LENGTH = 160


@dataclass(frozen=True)
class Rule:
    key: str
    limit: int
    window_seconds: int


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _key(key: str) -> str:
    return key[:KEY_LENGTH]


def retry_after(db: Session, rules: list[Rule]) -> int | None:
    """Seconds until the first exhausted rule frees a slot, or None if nothing is exhausted."""
    now = _now()
    worst: int | None = None
    for rule in rules:
        since = now - timedelta(seconds=rule.window_seconds)
        count, oldest = db.execute(
            select(func.count(), func.min(ThrottleEvent.created_at)).where(
                ThrottleEvent.key == _key(rule.key), ThrottleEvent.created_at > since
            )
        ).one()
        if count >= rule.limit and oldest is not None:
            wait = math.ceil((oldest - since).total_seconds())
            worst = max(worst or 0, max(1, wait))
    return worst


def record(db: Session, keys: list[str]) -> None:
    """Adds one event per key (the caller commits) and prunes expired rows."""
    now = _now()
    db.execute(delete(ThrottleEvent).where(ThrottleEvent.created_at < now - RETENTION))
    db.add_all(ThrottleEvent(key=_key(key), created_at=now) for key in keys)


# ---- policies ----

FIFTEEN_MINUTES = 15 * 60


def login_rules(ip: str, username: str) -> list[Rule]:
    # Per IP: stops one client guessing. Per username: slows a botnet guessing one account,
    # high enough that a few typos — or a stranger — cannot lock the real admin out quickly.
    return [
        Rule(f"login-ip:{ip}", 10, FIFTEEN_MINUTES),
        Rule(f"login-user:{username.strip().lower()}", 30, FIFTEEN_MINUTES),
    ]


def password_rules(admin_id: int, ip: str) -> list[Rule]:
    return [
        Rule(f"password-admin:{admin_id}", 5, FIFTEEN_MINUTES),
        Rule(f"password-ip:{ip}", 5, FIFTEEN_MINUTES),
    ]


def lead_rules(ip: str) -> list[Rule]:
    # Generous: mobile carriers put many visitors behind one address.
    return [Rule(f"lead-ip:{ip}", 20, 60 * 60)]
