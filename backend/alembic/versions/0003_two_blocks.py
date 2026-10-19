"""restructure the catalogue to the real building: 2 blocks × 9 floors

Блок А → Блок 1 and Блок Б → Блок 2 are renamed in place, so units that survive keep their
ids (and their leads and sales). Everything else in the old layout — blocks В–Н, the -1 and
10th floors, apartment 8 on every floor — is removed. Leads and sales that pointed to a
removed unit are kept: the link is cleared and the old address is written into the lead
message / sale comment. Every unit becomes free except units with an active sale (sold).

Areas, rooms, polygons and plans come from seed_data.py, the same source as a fresh seed.
An empty database (fresh install, tests) is left alone: seed.py fills it.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-19 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.core.config import get_settings
from seed_data import (
    APARTMENTS,
    BLOCKS,
    COMMERCIAL_FLOOR,
    COMMERCIAL_POLYGON,
    COMMERCIAL_UNIT,
    MEDIA_VERSION,
    RESIDENTIAL_FLOORS,
    SHOP_PLAN,
    TYPICAL_PLAN,
    apartment_rects,
    floor_label,
    rect_polygon,
    residential_price,
)

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

blocks = sa.table(
    "blocks",
    sa.column("id", sa.Integer),
    sa.column("letter", sa.String),
    sa.column("name", sa.String),
    sa.column("sort_order", sa.Integer),
)
floors = sa.table(
    "floors",
    sa.column("id", sa.Integer),
    sa.column("block_id", sa.Integer),
    sa.column("label", sa.String),
    sa.column("number", sa.Integer),
    sa.column("kind", sa.String),
    sa.column("plan_image", sa.String),
)
units = sa.table(
    "units",
    sa.column("id", sa.Integer),
    sa.column("floor_id", sa.Integer),
    sa.column("name", sa.String),
    sa.column("number", sa.Integer),
    sa.column("kind", sa.String),
    sa.column("rooms", sa.Integer),
    sa.column("area", sa.Numeric),
    sa.column("price_per_m2", sa.Numeric),
    sa.column("status", sa.String),
    sa.column("layout_image", sa.String),
    sa.column("blueprint_image", sa.String),
    sa.column("polygon", sa.JSON),
    sa.column("rooms_detail", sa.JSON),
)
leads = sa.table(
    "leads",
    sa.column("id", sa.Integer),
    sa.column("unit_id", sa.Integer),
    sa.column("name", sa.String),
    sa.column("message", sa.String),
)
sales = sa.table(
    "sales",
    sa.column("id", sa.Integer),
    sa.column("unit_id", sa.Integer),
    sa.column("buyer_name", sa.String),
    sa.column("comment", sa.Text),
    sa.column("is_archived", sa.Boolean),
)


def rooms_json(rooms: list[tuple[str, float]]) -> list[dict[str, float | str]]:
    return [{"name": name, "area": area} for name, area in rooms]


def upgrade() -> None:
    conn = op.get_bind()
    media = get_settings().media_url
    block_rows = conn.execute(
        sa.select(blocks.c.id, blocks.c.letter, blocks.c.name).order_by(
            blocks.c.sort_order, blocks.c.id
        )
    ).all()
    if not block_rows:
        return

    kept = list(block_rows[: len(BLOCKS)])
    kept_ids = {b.id for b in kept}

    # --- 1. Decide which units survive -------------------------------------------------
    rows = conn.execute(
        sa.select(
            units.c.id,
            units.c.number,
            units.c.name.label("unit_name"),
            floors.c.id.label("floor_id"),
            floors.c.number.label("floor_number"),
            floors.c.label.label("floor_label"),
            blocks.c.id.label("block_id"),
            blocks.c.name.label("block_name"),
        )
        .select_from(units.join(floors, units.c.floor_id == floors.c.id))
        .join(blocks, floors.c.block_id == blocks.c.id)
        .order_by(units.c.id)
    ).all()
    shop_kept: set[int] = set()  # floor ids whose shop is already chosen
    keep_units: set[int] = set()
    address: dict[int, str] = {}
    for r in rows:
        address[r.id] = f"{r.block_name} · {r.floor_label} · {r.unit_name}"
        if r.block_id not in kept_ids:
            continue
        if r.floor_number == COMMERCIAL_FLOOR and r.floor_id not in shop_kept:
            shop_kept.add(r.floor_id)
            keep_units.add(r.id)
        elif r.floor_number in RESIDENTIAL_FLOORS and 1 <= r.number <= len(APARTMENTS):
            keep_units.add(r.id)
    removed = [r.id for r in rows if r.id not in keep_units]

    # --- 2. Unlink leads and sales of removed units, keeping the old address ------------
    for chunk in (removed[i : i + 500] for i in range(0, len(removed), 500)):
        for lead in conn.execute(
            sa.select(leads.c.id, leads.c.unit_id, leads.c.name, leads.c.message).where(
                leads.c.unit_id.in_(chunk)
            )
        ).all():
            note = f"[Было: {address[lead.unit_id]}]"
            message = f"{note} {lead.message}" if lead.message else note
            conn.execute(
                leads.update()
                .where(leads.c.id == lead.id)
                .values(unit_id=None, message=message[:1000])
            )
            print(f"0003: lead #{lead.id} ({lead.name}) unlinked from {address[lead.unit_id]}")
        for sale in conn.execute(
            sa.select(sales.c.id, sales.c.unit_id, sales.c.buyer_name, sales.c.comment).where(
                sales.c.unit_id.in_(chunk)
            )
        ).all():
            note = f"[Было: {address[sale.unit_id]}]"
            comment = f"{note} {sale.comment}" if sale.comment else note
            conn.execute(
                sales.update().where(sales.c.id == sale.id).values(unit_id=None, comment=comment)
            )
            print(
                f"0003: sale #{sale.id} ({sale.buyer_name}) unlinked from {address[sale.unit_id]}"
            )
        conn.execute(units.delete().where(units.c.id.in_(chunk)))

    # --- 3. Drop floors and blocks outside the new layout -------------------------------
    valid_floors = {COMMERCIAL_FLOOR, *RESIDENTIAL_FLOORS}
    conn.execute(
        floors.delete().where(
            sa.or_(floors.c.block_id.not_in(kept_ids), floors.c.number.not_in(valid_floors))
        )
    )
    conn.execute(blocks.delete().where(blocks.c.id.not_in(kept_ids)))

    # Two-step rename: a temporary key first, so "1"/"2" never collide with a current letter.
    for b in kept:
        conn.execute(blocks.update().where(blocks.c.id == b.id).values(letter=f"~{b.id}"))
    for index, (b, (letter, name)) in enumerate(zip(kept, BLOCKS, strict=False)):
        conn.execute(
            blocks.update()
            .where(blocks.c.id == b.id)
            .values(letter=letter, name=name, sort_order=index)
        )
    for index in range(len(kept), len(BLOCKS)):
        letter, name = BLOCKS[index]
        kept.append(
            conn.execute(
                blocks.insert()
                .values(letter=letter, name=name, sort_order=index)
                .returning(blocks.c.id, blocks.c.letter, blocks.c.name)
            ).one()
        )

    # --- 4. Bring every floor and unit to the reference spec ----------------------------
    active_sales = {
        r.unit_id
        for r in conn.execute(
            sa.select(sales.c.unit_id).where(
                sales.c.unit_id.is_not(None), sales.c.is_archived.is_(False)
            )
        )
    }
    rects = apartment_rects()
    shop_name, shop_area, shop_rooms = COMMERCIAL_UNIT

    def ensure_floor(block_id: int, number: int, kind: str, plan: str) -> int:
        values = {
            "label": floor_label(number),
            "kind": kind,
            "plan_image": f"{media}/{plan}{MEDIA_VERSION}",
        }
        floor_id = conn.execute(
            sa.select(floors.c.id).where(floors.c.block_id == block_id, floors.c.number == number)
        ).scalar()
        if floor_id is None:
            return conn.execute(
                floors.insert()
                .values(block_id=block_id, number=number, **values)
                .returning(floors.c.id)
            ).scalar_one()
        conn.execute(floors.update().where(floors.c.id == floor_id).values(**values))
        return floor_id

    def ensure_unit(floor_id: int, number: int, values: dict[str, object]) -> None:
        unit_id = conn.execute(
            sa.select(units.c.id).where(units.c.floor_id == floor_id, units.c.number == number)
        ).scalar()
        if unit_id is None:
            conn.execute(units.insert().values(floor_id=floor_id, number=number, **values))
            return
        status = "sold" if unit_id in active_sales else "free"
        conn.execute(
            units.update().where(units.c.id == unit_id).values({**values, "status": status})
        )

    for b in kept:
        floor_id = ensure_floor(b.id, COMMERCIAL_FLOOR, "commercial", SHOP_PLAN)
        # The surviving shop may have any number; normalise it to 1.
        conn.execute(units.update().where(units.c.floor_id == floor_id).values(number=1))
        ensure_unit(
            floor_id,
            1,
            {
                "name": shop_name,
                "kind": "commercial",
                "rooms": None,
                "area": shop_area,
                "price_per_m2": None,
                "status": "free",
                "layout_image": f"{media}/units/layout_commercial_ground.png{MEDIA_VERSION}",
                "blueprint_image": f"{media}/units/blueprint_commercial_ground.png{MEDIA_VERSION}",
                "polygon": COMMERCIAL_POLYGON,
                "rooms_detail": rooms_json(shop_rooms),
            },
        )
        for floor_number in RESIDENTIAL_FLOORS:
            floor_id = ensure_floor(b.id, floor_number, "residential", TYPICAL_PLAN)
            for apt in APARTMENTS:
                ensure_unit(
                    floor_id,
                    apt.number,
                    {
                        "name": f"Хонаи {apt.number}",
                        "kind": "apartment",
                        "rooms": apt.rooms,
                        "area": apt.area,
                        "price_per_m2": residential_price(floor_number),
                        "status": "free",
                        "layout_image": f"{media}/units/layout_{apt.number}.png{MEDIA_VERSION}",
                        "blueprint_image": f"{media}/units/blueprint_{apt.number}.png{MEDIA_VERSION}",
                        "polygon": rect_polygon(rects[apt.number]),
                        "rooms_detail": rooms_json(apt.rooms_detail),
                    },
                )

    total = conn.execute(sa.select(sa.func.count()).select_from(units)).scalar_one()
    print(f"0003: {len(kept)} blocks, {total} units after restructure.")


def downgrade() -> None:
    # Data-only migration: the removed blocks, floors and units are not recreated.
    pass
