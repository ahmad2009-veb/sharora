"""placeholder drawings without words: point stored URLs at the regenerated files

The generated floor plans and unit drawings no longer carry Tajik captions, so they suit
both site languages. Their file names are unchanged; only the cache-busting `?v=2` suffix
becomes `?v=3`. Images uploaded by the admin have no suffix and are left alone.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-21 12:00:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLUMNS = [
    ("floors", "plan_image", "%/floors/plan_%?v=2"),
    ("units", "layout_image", "%/units/layout_%?v=2"),
    ("units", "blueprint_image", "%/units/blueprint_%?v=2"),
]


def _bump(old: str, new: str) -> None:
    for table, column, pattern in COLUMNS:
        op.execute(
            f"UPDATE {table} SET {column} = REPLACE({column}, '?v={old}', '?v={new}') "
            f"WHERE {column} LIKE '{pattern.replace('?v=2', f'?v={old}')}'"
        )


def upgrade() -> None:
    _bump("2", "3")


def downgrade() -> None:
    _bump("3", "2")
