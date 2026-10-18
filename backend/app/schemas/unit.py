from pydantic import Field

from app.models.enums import UnitKind, UnitStatus
from app.schemas.common import ORMModel, PolygonPoint, RoomDetail


class UnitListItem(ORMModel):
    id: int
    name: str
    number: int
    kind: UnitKind
    rooms: int | None
    area: float
    price_per_m2: float | None
    status: UnitStatus
    layout_image: str | None = None
    polygon: list[PolygonPoint] | None = None


class UnitDetail(ORMModel):
    id: int
    floor_id: int
    name: str
    number: int
    kind: UnitKind
    rooms: int | None
    area: float
    price_per_m2: float | None
    status: UnitStatus
    layout_image: str | None
    blueprint_image: str | None
    polygon: list[PolygonPoint] | None = None
    rooms_detail: list[RoomDetail] | None = None
    block_letter: str
    block_name: str
    floor_label: str
    floor_number: int


class UnitAdminOut(UnitDetail):
    pass


class UnitCreate(ORMModel):
    floor_id: int
    name: str = Field(min_length=1, max_length=60)
    number: int
    kind: UnitKind = UnitKind.apartment
    rooms: int | None = Field(default=None, ge=0, le=10)
    area: float = Field(gt=0)
    price_per_m2: float | None = Field(default=None, gt=0)
    status: UnitStatus = UnitStatus.free
    layout_image: str | None = None
    blueprint_image: str | None = None
    polygon: list[PolygonPoint] | None = None
    rooms_detail: list[RoomDetail] | None = None


class UnitUpdate(ORMModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    number: int | None = None
    kind: UnitKind | None = None
    rooms: int | None = Field(default=None, ge=0, le=10)
    area: float | None = Field(default=None, gt=0)
    price_per_m2: float | None = Field(default=None, gt=0)
    status: UnitStatus | None = None
    layout_image: str | None = None
    blueprint_image: str | None = None
    polygon: list[PolygonPoint] | None = None
    rooms_detail: list[RoomDetail] | None = None


class UnitStatusUpdate(ORMModel):
    status: UnitStatus
