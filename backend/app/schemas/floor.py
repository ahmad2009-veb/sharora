from app.models.enums import FloorKind
from app.schemas.common import ORMModel
from app.schemas.unit import UnitListItem


class FloorOut(ORMModel):
    id: int
    label: str
    number: int
    kind: FloorKind
    plan_image: str | None
    free_count: int
    total_count: int


class FloorWithUnits(FloorOut):
    units: list[UnitListItem]


class FloorCreate(ORMModel):
    block_id: int
    label: str
    number: int
    kind: FloorKind = FloorKind.residential
    plan_image: str | None = None


class FloorUpdate(ORMModel):
    label: str | None = None
    number: int | None = None
    kind: FloorKind | None = None
    plan_image: str | None = None
