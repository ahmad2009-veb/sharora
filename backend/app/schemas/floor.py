from pydantic import Field, field_validator

from app.models.enums import FloorKind
from app.schemas.common import ORMModel, reject_null
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
    label: str = Field(min_length=1, max_length=60)
    number: int
    kind: FloorKind = FloorKind.residential
    plan_image: str | None = Field(default=None, max_length=300)


class FloorUpdate(ORMModel):
    label: str | None = Field(default=None, min_length=1, max_length=60)
    number: int | None = None
    kind: FloorKind | None = None
    plan_image: str | None = Field(default=None, max_length=300)

    _not_null = field_validator("label", "number", "kind")(reject_null)
