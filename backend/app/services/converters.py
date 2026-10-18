from app.models import Unit
from app.schemas.unit import UnitDetail


def to_unit_detail(unit: Unit) -> UnitDetail:
    floor = unit.floor
    block = floor.block
    return UnitDetail(
        id=unit.id,
        floor_id=unit.floor_id,
        name=unit.name,
        number=unit.number,
        kind=unit.kind,
        rooms=unit.rooms,
        area=float(unit.area),
        price_per_m2=float(unit.price_per_m2) if unit.price_per_m2 is not None else None,
        status=unit.status,
        layout_image=unit.layout_image,
        blueprint_image=unit.blueprint_image,
        polygon=unit.polygon,
        rooms_detail=unit.rooms_detail,
        block_letter=block.letter,
        block_name=block.name,
        floor_label=floor.label,
        floor_number=floor.number,
    )
