"""Reference data shared by seed.py and scripts/generate_media.py.

Floor plan geometry is expressed in percent of the plan image so that the same
numbers drive both the generated placeholder drawing and the unit polygons.
"""

from dataclasses import dataclass

BLOCK_LETTERS = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "И", "К", "Л", "М", "Н"]

RESIDENTIAL_FLOORS = range(2, 11)

# Building outline and corridor on the floor plan (percent of image).
PLAN_LEFT, PLAN_RIGHT = 6.0, 94.0
PLAN_TOP, PLAN_BOTTOM = 12.0, 88.0
CORRIDOR_TOP, CORRIDOR_BOTTOM = 46.0, 54.0


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

# Areas of floor 2 in block А — used as the template for every residential floor.
APARTMENTS: list[ApartmentSpec] = [
    ApartmentSpec(
        1,
        75.70,
        2,
        [
            (LIVING, 24.6),
            (BEDROOM, 16.8),
            (KITCHEN, 13.2),
            (HALL, 10.9),
            (BATH, 5.4),
            (BALCONY, 4.8),
        ],
    ),
    ApartmentSpec(
        2,
        89.70,
        3,
        [
            (LIVING, 25.6),
            (BEDROOM, 16.3),
            (BEDROOM, 13.5),
            (KITCHEN, 12.4),
            (HALL, 12.0),
            (BATH, 5.5),
            (BALCONY, 4.4),
        ],
    ),
    ApartmentSpec(
        3,
        82.60,
        3,
        [
            (LIVING, 23.4),
            (BEDROOM, 14.8),
            (BEDROOM, 12.6),
            (KITCHEN, 11.8),
            (HALL, 10.9),
            (BATH, 5.1),
            (BALCONY, 4.0),
        ],
    ),
    ApartmentSpec(
        4, 45.60, 1, [(LIVING, 19.4), (KITCHEN, 10.2), (HALL, 7.1), (BATH, 4.3), (BALCONY, 4.6)]
    ),
    ApartmentSpec(
        5, 45.60, 1, [(LIVING, 19.4), (KITCHEN, 10.2), (HALL, 7.1), (BATH, 4.3), (BALCONY, 4.6)]
    ),
    ApartmentSpec(
        6,
        79.20,
        3,
        [
            (LIVING, 22.1),
            (BEDROOM, 14.2),
            (BEDROOM, 12.0),
            (KITCHEN, 11.3),
            (HALL, 10.6),
            (BATH, 5.0),
            (BALCONY, 4.0),
        ],
    ),
    ApartmentSpec(
        7,
        89.00,
        3,
        [
            (LIVING, 25.2),
            (BEDROOM, 16.1),
            (BEDROOM, 13.4),
            (KITCHEN, 12.6),
            (HALL, 11.8),
            (BATH, 5.6),
            (BALCONY, 4.3),
        ],
    ),
    ApartmentSpec(
        8,
        60.10,
        2,
        [
            (LIVING, 20.3),
            (BEDROOM, 13.6),
            (KITCHEN, 10.4),
            (HALL, 8.2),
            (BATH, 4.1),
            (BALCONY, 3.5),
        ],
    ),
]

# Top row runs left→right (1–4), bottom row continues clockwise right→left (5–8).
TOP_ROW = [1, 2, 3, 4]
BOTTOM_ROW = [8, 7, 6, 5]

COMMERCIAL_UNITS = {
    -1: (
        "Мағоза -1",
        612.40,
        [("Толори савдо", 528.6), ("Анбор", 61.4), (BATH, 9.6), (HALL, 12.8)],
    ),
    1: ("Мағоза 1", 586.20, [("Толори савдо", 509.3), ("Анбор", 52.1), (BATH, 9.6), (HALL, 15.2)]),
}


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
