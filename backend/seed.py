"""Seeds the database with 2 blocks × 9 floors (1 commercial + 8 residential × 7 units).

Usage:
    python seed.py                   # wipe catalogue data (blocks/floors/units/leads) and reseed
    python seed.py --if-empty        # seed only when there are no blocks yet (Docker, Vercel)
    python seed.py --demo-statuses   # random free/reserved/sold mix for local demos

Every unit starts free unless --demo-statuses is given.

Run `alembic upgrade head` first.
"""

import argparse
import random
from collections.abc import Callable

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    AdminUser,
    Block,
    CalculatorSettings,
    Floor,
    FloorKind,
    InstallmentPayment,
    Lead,
    Sale,
    Unit,
    UnitKind,
    UnitStatus,
)
from scripts.generate_media import generate as generate_media
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

MEDIA = get_settings().media_url
DEFAULT_PRICE_PER_M2 = 6800
STATUS_WEIGHTS = [(UnitStatus.free, 0.76), (UnitStatus.reserved, 0.01), (UnitStatus.sold, 0.23)]


def pick_status(rng: random.Random) -> UnitStatus:
    statuses, weights = zip(*STATUS_WEIGHTS, strict=True)
    return rng.choices(statuses, weights=weights, k=1)[0]


def rooms_json(rooms: list[tuple[str, float]]) -> list[dict[str, float | str]]:
    return [{"name": name, "area": area} for name, area in rooms]


def build_block(index: int, letter: str, name: str, status: Callable[[], UnitStatus]) -> Block:
    """One entrance: a shop on the commercial floor, then 7 apartments on each residential floor."""
    block = Block(letter=letter, name=name, sort_order=index)

    shop_name, shop_area, shop_rooms = COMMERCIAL_UNIT
    floor = Floor(
        label=floor_label(COMMERCIAL_FLOOR),
        number=COMMERCIAL_FLOOR,
        kind=FloorKind.commercial,
        plan_image=f"{MEDIA}/{SHOP_PLAN}{MEDIA_VERSION}",
    )
    floor.units.append(
        Unit(
            name=shop_name,
            number=1,
            kind=UnitKind.commercial,
            rooms=None,
            area=shop_area,
            price_per_m2=None,
            status=status(),
            layout_image=f"{MEDIA}/units/layout_commercial_ground.png{MEDIA_VERSION}",
            blueprint_image=f"{MEDIA}/units/blueprint_commercial_ground.png{MEDIA_VERSION}",
            polygon=COMMERCIAL_POLYGON,
            rooms_detail=rooms_json(shop_rooms),
        )
    )
    block.floors.append(floor)

    rects = apartment_rects()
    for floor_number in RESIDENTIAL_FLOORS:
        floor = Floor(
            label=floor_label(floor_number),
            number=floor_number,
            kind=FloorKind.residential,
            plan_image=f"{MEDIA}/{TYPICAL_PLAN}{MEDIA_VERSION}",
        )
        for apt in APARTMENTS:
            floor.units.append(
                Unit(
                    name=f"Хонаи {apt.number}",
                    number=apt.number,
                    kind=UnitKind.apartment,
                    rooms=apt.rooms,
                    area=apt.area,
                    price_per_m2=residential_price(floor_number),
                    status=status(),
                    layout_image=f"{MEDIA}/units/layout_{apt.number}.png{MEDIA_VERSION}",
                    blueprint_image=f"{MEDIA}/units/blueprint_{apt.number}.png{MEDIA_VERSION}",
                    polygon=rect_polygon(rects[apt.number]),
                    rooms_detail=rooms_json(apt.rooms_detail),
                )
            )
        block.floors.append(floor)
    return block


def seed(db: Session, rng: random.Random | None = None) -> None:
    """Rebuild the catalogue. With `rng`, statuses are a random demo mix; otherwise all free."""
    # SQLite does not enforce ON DELETE CASCADE: clear schedules too, or they would
    # attach to new sales that reuse the ids.
    db.execute(delete(InstallmentPayment))
    db.execute(delete(Sale))
    db.execute(delete(Lead))
    db.execute(delete(Unit))
    db.execute(delete(Floor))
    db.execute(delete(Block))

    for index, (letter, name) in enumerate(BLOCKS):
        db.add(
            build_block(
                index, letter, name, (lambda: pick_status(rng)) if rng else lambda: UnitStatus.free
            )
        )

    settings_row = db.get(CalculatorSettings, 1) or CalculatorSettings(id=1)
    settings_row.default_price_per_m2 = DEFAULT_PRICE_PER_M2
    settings_row.down_payment_min_percent = 30
    settings_row.max_term_months = 24
    db.add(settings_row)

    cfg = get_settings()
    # Only on an empty table: the admin may have renamed themselves since.
    if db.execute(select(AdminUser.id).limit(1)).first() is None:
        db.add(
            AdminUser(
                username=cfg.default_admin_username,
                password_hash=hash_password(cfg.require_admin_password()),
            )
        )
    db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--if-empty", action="store_true", help="skip if blocks already exist")
    parser.add_argument("--demo-statuses", action="store_true", help="random status mix")
    parser.add_argument("--random-seed", type=int, default=2026)
    args = parser.parse_args()

    generate_media()
    with SessionLocal() as db:
        if args.if_empty and db.execute(select(Block.id).limit(1)).first() is not None:
            print("Database already seeded — skipping.")
            return
        seed(db, random.Random(args.random_seed) if args.demo_statuses else None)
        units = db.query(Unit).count()
        print(f"Seeded {len(BLOCKS)} blocks, {units} units.")


if __name__ == "__main__":
    main()
