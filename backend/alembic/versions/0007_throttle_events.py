"""throttle events: sign-in, password and lead attempts shared by all API instances

Replaces the per-process counters, which each Vercel instance kept separately.

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-25 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "throttle_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=160), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_throttle_events_key_created", "throttle_events", ["key", "created_at"])
    op.create_index("ix_throttle_events_created_at", "throttle_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_throttle_events_created_at", table_name="throttle_events")
    op.drop_index("ix_throttle_events_key_created", table_name="throttle_events")
    op.drop_table("throttle_events")
