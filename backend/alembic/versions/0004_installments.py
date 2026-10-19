"""installment schedules: sale payment terms and installment_payments

amount_paid becomes down_payment (what the buyer paid at signing); existing sales become
«full» payments with no schedule, so nothing about them changes.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-19 18:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("sales") as batch_op:
        batch_op.alter_column("amount_paid", new_column_name="down_payment")
        batch_op.add_column(
            sa.Column("payment_type", sa.String(length=16), nullable=False, server_default="full")
        )
        batch_op.add_column(sa.Column("term_months", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "markup_percent",
                sa.Numeric(precision=5, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch_op.add_column(sa.Column("first_payment_date", sa.Date(), nullable=True))

    op.create_table(
        "installment_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sale_id", sa.Integer(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column(
            "paid_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"
        ),
        sa.Column("paid_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.ForeignKeyConstraint(["sale_id"], ["sales.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("installment_payments") as batch_op:
        batch_op.create_index("ix_installment_payments_sale_id", ["sale_id"])
        batch_op.create_index("ix_installment_payments_due_date", ["due_date"])


def downgrade() -> None:
    op.drop_table("installment_payments")
    with op.batch_alter_table("sales") as batch_op:
        batch_op.drop_column("first_payment_date")
        batch_op.drop_column("markup_percent")
        batch_op.drop_column("term_months")
        batch_op.drop_column("payment_type")
        batch_op.alter_column("down_payment", new_column_name="amount_paid")
