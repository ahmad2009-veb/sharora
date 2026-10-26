from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ThrottleEvent(Base):
    """One failed sign-in / wrong password / submitted lead, counted by services/throttle.py.

    Kept in the database (not process memory) so every Vercel instance sees the same counts.
    Rows older than a day are pruned on every write.
    """

    __tablename__ = "throttle_events"
    __table_args__ = (Index("ix_throttle_events_key_created", "key", "created_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(160), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
