"""sales: buyer data for sold units

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-18 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("buyer_name", sa.String(length=160), nullable=False),
        sa.Column("buyer_phone", sa.String(length=32), nullable=False),
        sa.Column("amount_paid", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("total_price", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("sale_date", sa.Date(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["admin_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("sales") as batch_op:
        batch_op.create_index("ix_sales_unit_id", ["unit_id"])
        batch_op.create_index("ix_sales_is_archived", ["is_archived"])


def downgrade() -> None:
    with op.batch_alter_table("sales") as batch_op:
        batch_op.drop_index("ix_sales_is_archived")
        batch_op.drop_index("ix_sales_unit_id")
    op.drop_table("sales")
