from fastapi import APIRouter, Depends, HTTPException, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import ACCESS_TOKEN_COOKIE_NAME
from app.models import Block, CalculatorSettings, Floor, Lead, Unit, UnitStatus
from app.schemas.block import BlockOut
from app.schemas.floor import FloorOut, FloorWithUnits
from app.schemas.lead import LeadCreate, LeadOut
from app.schemas.settings import SettingsOut
from app.schemas.stats import StatsOut
from app.schemas.unit import UnitDetail, UnitListItem
from app.services.aggregates import (
    BlockCounts,
    block_counts,
    floor_counts,
    get_block_or_none,
    global_stats,
)
from app.services.converters import to_unit_detail

settings = get_settings()

# Visitors' browsers may reuse catalogue answers for a few seconds (and revalidate in the
# background), which saves repeat requests when moving between pages. Browser-only on
# purpose: no s-maxage, so the CDN never serves a stale status. The admin panel reads the
# same endpoints right after editing a unit, so its requests are never cached.
PUBLIC_CACHE = "public, max-age=10, stale-while-revalidate=50"


def cache_headers(request: Request, response: Response) -> None:
    if request.method != "GET":
        return
    admin = ACCESS_TOKEN_COOKIE_NAME in request.cookies
    response.headers["Cache-Control"] = "private, no-store" if admin else PUBLIC_CACHE


router = APIRouter(prefix="/api", tags=["public"], dependencies=[Depends(cache_headers)])


def client_ip(request: Request) -> str:
    # Behind Vercel's proxy the socket peer is shared; Vercel overwrites X-Forwarded-For.
    if settings.vercel:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip)


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)) -> StatsOut:
    stats = global_stats(db)
    return StatsOut(
        free=stats.get("free", 0),
        reserved=stats.get("reserved", 0),
        sold=stats.get("sold", 0),
        total=stats.get("total", 0),
    )


@router.get("/blocks", response_model=list[BlockOut])
def list_blocks(db: Session = Depends(get_db)) -> list[BlockOut]:
    blocks = db.execute(select(Block).order_by(Block.sort_order)).scalars().all()
    counts = block_counts(db)
    result: list[BlockOut] = []
    for block in blocks:
        c = counts.get(block.id, BlockCounts())
        result.append(
            BlockOut(
                id=block.id,
                letter=block.letter,
                name=block.name,
                sort_order=block.sort_order,
                cover_image=block.cover_image,
                free_count=c.free,
                reserved_count=c.reserved,
                sold_count=c.sold,
                total_count=c.total,
            )
        )
    return result


@router.get("/blocks/{letter}/floors", response_model=list[FloorOut])
def list_block_floors(letter: str, db: Session = Depends(get_db)) -> list[FloorOut]:
    block = get_block_or_none(db, letter)
    if block is None:
        raise HTTPException(status_code=404, detail="Блок не найден")

    floors = (
        db.execute(select(Floor).where(Floor.block_id == block.id).order_by(Floor.number))
        .scalars()
        .all()
    )
    counts = floor_counts(db, block.id)
    result: list[FloorOut] = []
    for floor in floors:
        free, total = counts.get(floor.id, (0, 0))
        result.append(
            FloorOut(
                id=floor.id,
                label=floor.label,
                number=floor.number,
                kind=floor.kind,
                plan_image=floor.plan_image,
                free_count=free,
                total_count=total,
            )
        )
    return result


@router.get("/floors/{floor_id}/units", response_model=FloorWithUnits)
def get_floor_units(floor_id: int, db: Session = Depends(get_db)) -> FloorWithUnits:
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(status_code=404, detail="Этаж не найден")

    units = (
        db.execute(select(Unit).where(Unit.floor_id == floor_id).order_by(Unit.number))
        .scalars()
        .all()
    )
    free = sum(1 for u in units if u.status == UnitStatus.free)
    return FloorWithUnits(
        id=floor.id,
        label=floor.label,
        number=floor.number,
        kind=floor.kind,
        plan_image=floor.plan_image,
        free_count=free,
        total_count=len(units),
        units=[UnitListItem.model_validate(u) for u in units],
    )


@router.get("/units/{unit_id}", response_model=UnitDetail)
def get_unit(unit_id: int, db: Session = Depends(get_db)) -> UnitDetail:
    unit = db.execute(
        select(Unit)
        .options(joinedload(Unit.floor).joinedload(Floor.block))
        .where(Unit.id == unit_id)
    ).scalar_one_or_none()
    if unit is None:
        raise HTTPException(status_code=404, detail="Квартира не найдена")
    return to_unit_detail(unit)


@router.get("/units", response_model=list[UnitDetail])
def search_units(
    block: str | None = None,
    floor: int | None = None,
    rooms: int | None = None,
    min_area: float | None = None,
    max_area: float | None = None,
    status: UnitStatus | None = None,
    db: Session = Depends(get_db),
) -> list[UnitDetail]:
    query = select(Unit).options(joinedload(Unit.floor).joinedload(Floor.block))

    if block:
        query = query.where(Unit.floor.has(Floor.block.has(Block.letter == block)))
    if floor is not None:
        query = query.where(Unit.floor.has(Floor.number == floor))
    if rooms is not None:
        query = query.where(Unit.rooms == rooms)
    if min_area is not None:
        query = query.where(Unit.area >= min_area)
    if max_area is not None:
        query = query.where(Unit.area <= max_area)
    if status is not None:
        query = query.where(Unit.status == status)

    units = db.execute(query.order_by(Unit.id)).unique().scalars().all()
    return [to_unit_detail(u) for u in units]


@router.get("/settings", response_model=SettingsOut)
def get_settings_public(db: Session = Depends(get_db)) -> SettingsOut:
    settings_row = db.get(CalculatorSettings, 1)
    if settings_row is None:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    return SettingsOut.model_validate(settings_row)


@router.post("/leads", response_model=LeadOut, status_code=201)
@limiter.limit("5/minute")
def create_lead(request: Request, payload: LeadCreate, db: Session = Depends(get_db)) -> LeadOut:
    if payload.unit_id is not None and db.get(Unit, payload.unit_id) is None:
        raise HTTPException(status_code=404, detail="Квартира не найдена")

    lead = Lead(
        unit_id=payload.unit_id,
        name=payload.name,
        phone=payload.phone,
        message=payload.message,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadOut.model_validate(lead)
