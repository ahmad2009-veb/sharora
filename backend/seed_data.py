"""Reference data shared by seed.py and scripts/generate_media.py.

Floor plan geometry is expressed in percent of the plan image so that the same
numbers drive both the generated placeholder drawing and the unit polygons.
"""

from dataclasses import dataclass

# (URL key, display name). The key is stored in Block.letter and used in /apartments?block=.
BLOCKS = [("1", "Блок 1"), ("2", "Блок 2")]

COMMERCIAL_FLOOR = 1
RESIDENTIAL_FLOORS = range(2, 10)

# Typical floor (percent of the plan image): apartments 1–4 along the top, 7–5 along the
# bottom, the corridor between them and the stair/lift core in its middle.
PLAN_LEFT, PLAN_RIGHT = 5.0, 95.0
PLAN_TOP, PLAN_BOTTOM = 10.0, 90.0
CORRIDOR_TOP, CORRIDOR_BOTTOM = 42.0, 58.0
CORE = (43.0, CORRIDOR_TOP, 57.0, CORRIDOR_BOTTOM)

# Placeholder plans served from backend/media; the admin replaces them per floor.
TYPICAL_PLAN = "floors/plan_typical.svg"
SHOP_PLAN = "floors/plan_shop.svg"


@dataclass(frozen=True)
class ApartmentSpec:
    number: int
    area: float
    rooms: int
    rooms_detail: list[tuple[str, float]]


LIVING = "Ҳуҷраи умумӣ"
BEDROOM = "Ҳуҷраи хоб"
KITCHEN = "Ошхона"
HALL = "Даҳлез"
BATH = "Ҳ/Б"
BALCONY = "Ч/к"

# One entrance, 7 apartments per residential floor (42–103 m²), the same on every floor.
# Provisional areas — the client corrects exact numbers in the admin panel.
APARTMENTS: list[ApartmentSpec] = [
    ApartmentSpec(
        1, 42.00, 1, [(LIVING, 18.4), (KITCHEN, 9.6), (HALL, 6.2), (BATH, 4.2), (BALCONY, 3.6)]
    ),
    ApartmentSpec(
        2, 56.00, 1, [(LIVING, 22.6), (KITCHEN, 13.2), (HALL, 9.4), (BATH, 5.2), (BALCONY, 5.6)]
    ),
    ApartmentSpec(
        3,
        64.00,
        2,
        [
            (LIVING, 21.4),
            (BEDROOM, 14.0),
            (KITCHEN, 11.0),
            (HALL, 8.6),
            (BATH, 4.6),
            (BALCONY, 4.4),
        ],
    ),
    ApartmentSpec(
        4,
        75.00,
        2,
        [
            (LIVING, 24.4),
            (BEDROOM, 16.6),
            (KITCHEN, 13.0),
            (HALL, 10.8),
            (BATH, 5.4),
            (BALCONY, 4.8),
        ],
    ),
    ApartmentSpec(
        5,
        83.00,
        3,
        [
            (LIVING, 23.6),
            (BEDROOM, 14.8),
            (BEDROOM, 12.4),
            (KITCHEN, 11.8),
            (HALL, 11.0),
            (BATH, 5.2),
            (BALCONY, 4.2),
        ],
    ),
    ApartmentSpec(
        6,
        94.00,
        3,
        [
            (LIVING, 26.8),
            (BEDROOM, 17.2),
            (BEDROOM, 14.0),
            (KITCHEN, 13.4),
            (HALL, 12.4),
            (BATH, 5.8),
            (BALCONY, 4.4),
        ],
    ),
    ApartmentSpec(
        7,
        103.00,
        4,
        [
            (LIVING, 27.0),
            (BEDROOM, 16.4),
            (BEDROOM, 13.2),
            (BEDROOM, 11.8),
            (KITCHEN, 13.6),
            (HALL, 11.6),
            (BATH, 5.6),
            (BALCONY, 3.8),
        ],
    ),
]

# Top row runs left→right (1–4), bottom row continues clockwise right→left (5–7).
TOP_ROW = [1, 2, 3, 4]
BOTTOM_ROW = [7, 6, 5]

# Floor 1: one shop per block (the admin can split it into several units).
SHOP_NAME = "Мағоза 1"
COMMERCIAL_UNIT = (
    SHOP_NAME,
    480.00,
    [("Толори савдо", 412.6), ("Анбор", 42.4), (BATH, 9.6), (HALL, 15.4)],
)


def _row_rects(numbers: list[int], top: float, bottom: float) -> dict[int, tuple[float, ...]]:
    areas = {a.number: a.area for a in APARTMENTS}
    total = sum(areas[n] for n in numbers)
    width = PLAN_RIGHT - PLAN_LEFT
    rects: dict[int, tuple[float, ...]] = {}
    x = PLAN_LEFT
    for n in numbers:
        w = width * areas[n] / total
        rects[n] = (round(x, 2), top, round(x + w, 2), bottom)
        x += w
    return rects


def apartment_rects() -> dict[int, tuple[float, ...]]:
    """{number: (x1, y1, x2, y2)} in percent of the floor plan image."""
    return {
        **_row_rects(TOP_ROW, PLAN_TOP, CORRIDOR_TOP),
        **_row_rects(BOTTOM_ROW, CORRIDOR_BOTTOM, PLAN_BOTTOM),
    }


def rect_polygon(rect: tuple[float, ...]) -> list[dict[str, float]]:
    x1, y1, x2, y2 = rect
    return [{"x": x1, "y": y1}, {"x": x2, "y": y1}, {"x": x2, "y": y2}, {"x": x1, "y": y2}]


COMMERCIAL_POLYGON = rect_polygon((PLAN_LEFT, PLAN_TOP, PLAN_RIGHT, PLAN_BOTTOM))


def floor_label(number: int) -> str:
    return f"Этаж {number}"


def residential_price(floor_number: int) -> int:
    """Lower floors are slightly more expensive in this market; top floor gets a view premium."""
    price = 7200 - (floor_number - 2) * 100
    return price + 400 if floor_number == max(RESIDENTIAL_FLOORS) else price


# Appended to placeholder image URLs; bump it whenever the generated drawings change so
# browsers and the CDN don't keep showing cached copies under the same file name.
MEDIA_VERSION = "?v=2"
