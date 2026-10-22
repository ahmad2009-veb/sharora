"""admin account page: last login time and a token version for signing out other sessions

Existing admins keep their password; token_version starts at 0. Tokens issued before this
release carry the username instead of the id, so everyone signs in once more after deploy.

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-22 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("admin_users") as batch_op:
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(), nullable=True))
        batch_op.add_column(
            sa.Column("token_version", sa.Integer(), nullable=False, server_default="0")
        )


def downgrade() -> None:
    with op.batch_alter_table("admin_users") as batch_op:
        batch_op.drop_column("token_version")
        batch_op.drop_column("last_login_at")
