"""Seeds the database with 12 blocks × 11 floors (2 commercial + 9 residential × 8 units).

Usage:
    python seed.py             # wipe catalogue data (blocks/floors/units/leads) and reseed
    python seed.py --if-empty  # seed only when there are no blocks yet (used in Docker)

Run `alembic upgrade head` first.
"""

import argparse
import random

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
    Lead,
    Sale,
    Unit,
    UnitKind,
    UnitStatus,
)
from scripts.generate_media import generate as generate_media
from seed_data import (
    APARTMENTS,
    BLOCK_LETTERS,
    COMMERCIAL_POLYGON,
    COMMERCIAL_UNITS,
    RESIDENTIAL_FLOORS,
    apartment_rects,
    rect_polygon,
)

MEDIA = get_settings().media_url
DEFAULT_PRICE_PER_M2 = 6800
STATUS_WEIGHTS = [(UnitStatus.free, 0.76), (UnitStatus.reserved, 0.01), (UnitStatus.sold, 0.23)]


def residential_price(floor_number: int) -> int:
    """Lower floors are slightly more expensive in this market; top floor gets a view premium."""
    price = 7200 - (floor_number - 2) * 100
    return price + 400 if floor_number == max(RESIDENTIAL_FLOORS) else price


def pick_status(rng: random.Random) -> UnitStatus:
    statuses, weights = zip(*STATUS_WEIGHTS, strict=True)
    return rng.choices(statuses, weights=weights, k=1)[0]


def rooms_json(rooms: list[tuple[str, float]]) -> list[dict[str, float | str]]:
    return [{"name": name, "area": area} for name, area in rooms]


def build_block(index: int, letter: str, rng: random.Random) -> Block:
    block = Block(letter=letter, name=f"Блок {letter}", sort_order=index)

    for number, (name, area, rooms) in sorted(COMMERCIAL_UNITS.items()):
        suffix = "basement" if number < 0 else "ground"
        floor = Floor(
            label="-1 Мағоза" if number < 0 else "Мағоза 1",
            number=number,
            kind=FloorKind.commercial,
            plan_image=f"{MEDIA}/floors/plan_commercial.png",
        )
        floor.units.append(
            Unit(
                name=name,
                number=1,
                kind=UnitKind.commercial,
                rooms=None,
                area=area,
                price_per_m2=None,
                status=pick_status(rng),
                layout_image=f"{MEDIA}/units/layout_commercial_{suffix}.png",
                blueprint_image=f"{MEDIA}/units/blueprint_commercial_{suffix}.png",
                polygon=COMMERCIAL_POLYGON,
                rooms_detail=rooms_json(rooms),
            )
        )
        block.floors.append(floor)

    rects = apartment_rects()
    for floor_number in RESIDENTIAL_FLOORS:
        floor = Floor(
            label=f"Этаж {floor_number}",
            number=floor_number,
            kind=FloorKind.residential,
            plan_image=f"{MEDIA}/floors/plan_residential.png",
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
                    status=pick_status(rng),
                    layout_image=f"{MEDIA}/units/layout_{apt.number}.png",
                    blueprint_image=f"{MEDIA}/units/blueprint_{apt.number}.png",
                    polygon=rect_polygon(rects[apt.number]),
                    rooms_detail=rooms_json(apt.rooms_detail),
                )
            )
        block.floors.append(floor)
    return block


def seed(db: Session, rng: random.Random) -> None:
    db.execute(delete(Sale))
    db.execute(delete(Lead))
    db.execute(delete(Unit))
    db.execute(delete(Floor))
    db.execute(delete(Block))

    for index, letter in enumerate(BLOCK_LETTERS):
        db.add(build_block(index, letter, rng))

    settings_row = db.get(CalculatorSettings, 1) or CalculatorSettings(id=1)
    settings_row.default_price_per_m2 = DEFAULT_PRICE_PER_M2
    settings_row.down_payment_min_percent = 30
    settings_row.max_term_months = 24
    db.add(settings_row)

    cfg = get_settings()
    admin_exists = db.execute(
        select(AdminUser).where(AdminUser.username == cfg.default_admin_username)
    ).scalar_one_or_none()
    if admin_exists is None:
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
    parser.add_argument("--random-seed", type=int, default=2026)
    args = parser.parse_args()

    generate_media()
    with SessionLocal() as db:
        if args.if_empty and db.execute(select(Block.id).limit(1)).first() is not None:
            print("Database already seeded — skipping.")
            return
        seed(db, random.Random(args.random_seed))
        units = db.query(Unit).count()
        print(f"Seeded {len(BLOCK_LETTERS)} blocks, {units} units.")


if __name__ == "__main__":
    main()
