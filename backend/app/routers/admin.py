from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_admin
from app.core.security import ACCESS_TOKEN_COOKIE_NAME, create_access_token, verify_password
from app.models import AdminUser, Block, CalculatorSettings, Floor, Lead, Sale, Unit, UnitStatus
from app.schemas.auth import AdminMeOut, LoginRequest
from app.schemas.block import BlockCreate, BlockOut, BlockUpdate
from app.schemas.floor import FloorCreate, FloorOut, FloorUpdate
from app.schemas.lead import LeadAdminOut, LeadUpdate
from app.schemas.sale import SaleCreate, SaleOut, SaleUpdate
from app.schemas.settings import SettingsOut, SettingsUpdate
from app.schemas.unit import UnitAdminOut, UnitCreate, UnitStatusUpdate, UnitUpdate
from app.services.aggregates import block_counts
from app.services.converters import to_unit_detail
from app.services.media import UPLOAD_SUBDIRS, save_upload

settings = get_settings()

router = APIRouter(prefix="/api/admin", tags=["admin"])
protected = APIRouter(dependencies=[Depends(get_current_admin)])


def _load_unit(db: Session, unit_id: int) -> Unit:
    unit = db.execute(
        select(Unit)
        .options(joinedload(Unit.floor).joinedload(Floor.block))
        .where(Unit.id == unit_id)
    ).scalar_one_or_none()
    if unit is None:
        raise HTTPException(status_code=404, detail="Квартира не найдена")
    return unit


def _unit_out(unit: Unit) -> UnitAdminOut:
    return UnitAdminOut(**to_unit_detail(unit).model_dump())


def _active_sale(db: Session, unit_id: int) -> Sale | None:
    return db.execute(
        select(Sale).where(Sale.unit_id == unit_id, Sale.is_archived.is_(False))
    ).scalar_one_or_none()


def _apply_status(db: Session, unit: Unit, new_status: UnitStatus) -> None:
    """Status changes outside /sell: «sold» needs buyer data; leaving «sold» archives the sale."""
    if new_status == unit.status:
        return
    if new_status == UnitStatus.sold:
        raise HTTPException(status_code=400, detail="Используйте /sell с данными покупателя")
    if unit.status == UnitStatus.sold:
        sale = _active_sale(db, unit.id)
        if sale is not None:
            sale.is_archived = True
    unit.status = new_status


def _load_sale(db: Session, sale_id: int) -> Sale:
    sale = db.execute(
        select(Sale)
        .options(
            joinedload(Sale.unit).joinedload(Unit.floor).joinedload(Floor.block),
            joinedload(Sale.author),
        )
        .where(Sale.id == sale_id)
    ).scalar_one_or_none()
    if sale is None:
        raise HTTPException(status_code=404, detail="Продажа не найдена")
    return sale


def _block_out(db: Session, block: Block) -> BlockOut:
    free, total = block_counts(db).get(block.id, (0, 0))
    return BlockOut(
        id=block.id,
        letter=block.letter,
        name=block.name,
        sort_order=block.sort_order,
        cover_image=block.cover_image,
        free_count=free,
        total_count=total,
    )


def _floor_out(floor: Floor) -> FloorOut:
    units = floor.units
    return FloorOut(
        id=floor.id,
        label=floor.label,
        number=floor.number,
        kind=floor.kind,
        plan_image=floor.plan_image,
        free_count=sum(1 for u in units if u.status == UnitStatus.free),
        total_count=len(units),
    )


# ---------- auth ----------


@router.post("/login", response_model=AdminMeOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> AdminMeOut:
    admin = db.execute(
        select(AdminUser).where(AdminUser.username == payload.username)
    ).scalar_one_or_none()
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=create_access_token(subject=admin.username),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    return AdminMeOut(id=admin.id, username=admin.username)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(ACCESS_TOKEN_COOKIE_NAME, path="/")
    return {"ok": True}


@protected.get("/me", response_model=AdminMeOut)
def me(admin: AdminUser = Depends(get_current_admin)) -> AdminMeOut:
    return AdminMeOut(id=admin.id, username=admin.username)


# ---------- blocks ----------


@protected.post("/blocks", response_model=BlockOut, status_code=201)
def create_block(payload: BlockCreate, db: Session = Depends(get_db)) -> BlockOut:
    block = Block(**payload.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return _block_out(db, block)


@protected.patch("/blocks/{block_id}", response_model=BlockOut)
def update_block(block_id: int, payload: BlockUpdate, db: Session = Depends(get_db)) -> BlockOut:
    block = db.get(Block, block_id)
    if block is None:
        raise HTTPException(status_code=404, detail="Блок не найден")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(block, field, value)
    db.commit()
    db.refresh(block)
    return _block_out(db, block)


@protected.delete("/blocks/{block_id}", status_code=204)
def delete_block(block_id: int, db: Session = Depends(get_db)) -> None:
    block = db.get(Block, block_id)
    if block is None:
        raise HTTPException(status_code=404, detail="Блок не найден")
    db.delete(block)
    db.commit()


# ---------- floors ----------


@protected.post("/floors", response_model=FloorOut, status_code=201)
def create_floor(payload: FloorCreate, db: Session = Depends(get_db)) -> FloorOut:
    if db.get(Block, payload.block_id) is None:
        raise HTTPException(status_code=404, detail="Блок не найден")
    floor = Floor(**payload.model_dump())
    db.add(floor)
    db.commit()
    db.refresh(floor)
    return _floor_out(floor)


@protected.patch("/floors/{floor_id}", response_model=FloorOut)
def update_floor(floor_id: int, payload: FloorUpdate, db: Session = Depends(get_db)) -> FloorOut:
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(status_code=404, detail="Этаж не найден")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(floor, field, value)
    db.commit()
    db.refresh(floor)
    return _floor_out(floor)


@protected.delete("/floors/{floor_id}", status_code=204)
def delete_floor(floor_id: int, db: Session = Depends(get_db)) -> None:
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(status_code=404, detail="Этаж не найден")
    db.delete(floor)
    db.commit()


# ---------- units ----------


@protected.get("/units", response_model=list[UnitAdminOut])
def list_units_admin(
    block: str | None = None,
    floor: int | None = None,
    status: UnitStatus | None = None,
    db: Session = Depends(get_db),
) -> list[UnitAdminOut]:
    query = select(Unit).options(joinedload(Unit.floor).joinedload(Floor.block))
    if block:
        query = query.where(Unit.floor.has(Floor.block.has(Block.letter == block)))
    if floor is not None:
        query = query.where(Unit.floor.has(Floor.number == floor))
    if status is not None:
        query = query.where(Unit.status == status)
    units = db.execute(query.order_by(Unit.id)).unique().scalars().all()
    return [_unit_out(u) for u in units]


@protected.post("/units", response_model=UnitAdminOut, status_code=201)
def create_unit(payload: UnitCreate, db: Session = Depends(get_db)) -> UnitAdminOut:
    if db.get(Floor, payload.floor_id) is None:
        raise HTTPException(status_code=404, detail="Этаж не найден")
    unit = Unit(**payload.model_dump())
    db.add(unit)
    db.commit()
    return _unit_out(_load_unit(db, unit.id))


@protected.patch("/units/{unit_id}", response_model=UnitAdminOut)
def update_unit(unit_id: int, payload: UnitUpdate, db: Session = Depends(get_db)) -> UnitAdminOut:
    unit = _load_unit(db, unit_id)
    data = payload.model_dump(exclude_unset=True)
    if (new_status := data.pop("status", None)) is not None:
        _apply_status(db, unit, new_status)
    for field, value in data.items():
        setattr(unit, field, value)
    db.commit()
    return _unit_out(_load_unit(db, unit_id))


@protected.patch("/units/{unit_id}/status", response_model=UnitAdminOut)
def update_unit_status(
    unit_id: int, payload: UnitStatusUpdate, db: Session = Depends(get_db)
) -> UnitAdminOut:
    unit = _load_unit(db, unit_id)
    _apply_status(db, unit, payload.status)
    db.commit()
    return _unit_out(_load_unit(db, unit_id))


@protected.delete("/units/{unit_id}", status_code=204)
def delete_unit(unit_id: int, db: Session = Depends(get_db)) -> None:
    db.delete(_load_unit(db, unit_id))
    db.commit()


# ---------- sales (buyer data — admin only) ----------


@protected.post("/units/{unit_id}/sell", response_model=SaleOut, status_code=201)
def sell_unit(
    unit_id: int,
    payload: SaleCreate,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> SaleOut:
    unit = _load_unit(db, unit_id)
    if _active_sale(db, unit.id) is not None:
        raise HTTPException(status_code=409, detail="Квартира уже продана")
    # A unit marked «sold» before buyer tracking existed may get its buyer attached here.
    sale = Sale(unit_id=unit.id, created_by=admin.id, **payload.model_dump())
    db.add(sale)
    unit.status = UnitStatus.sold
    db.commit()  # one transaction: the sale and the status change land together
    return SaleOut.from_sale(_load_sale(db, sale.id))


@protected.get("/units/{unit_id}/sale", response_model=SaleOut)
def get_unit_sale(unit_id: int, db: Session = Depends(get_db)) -> SaleOut:
    _load_unit(db, unit_id)
    sale = _active_sale(db, unit_id)
    if sale is None:
        raise HTTPException(status_code=404, detail="Данные покупателя не найдены")
    return SaleOut.from_sale(_load_sale(db, sale.id))


@protected.patch("/sales/{sale_id}", response_model=SaleOut)
def update_sale(sale_id: int, payload: SaleUpdate, db: Session = Depends(get_db)) -> SaleOut:
    sale = _load_sale(db, sale_id)
    data = payload.model_dump(exclude_unset=True)
    for required in ("buyer_name", "buyer_phone", "amount_paid", "sale_date"):
        if required in data and data[required] is None:
            raise HTTPException(status_code=422, detail="Заполните обязательные поля")
    paid = data.get("amount_paid", sale.amount_paid)
    total = data.get("total_price", sale.total_price)
    if total is not None and paid > total:
        raise HTTPException(
            status_code=422, detail="Сумма оплаты не может превышать общую стоимость"
        )
    for field, value in data.items():
        setattr(sale, field, value)
    db.commit()
    return SaleOut.from_sale(_load_sale(db, sale_id))


@protected.get("/sales", response_model=list[SaleOut])
def list_sales(
    search: str | None = None,
    block: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    archived: bool = False,
    db: Session = Depends(get_db),
) -> list[SaleOut]:
    query = (
        select(Sale)
        .options(
            joinedload(Sale.unit).joinedload(Unit.floor).joinedload(Floor.block),
            joinedload(Sale.author),
        )
        .where(Sale.is_archived.is_(archived))
        .order_by(Sale.sale_date.desc(), Sale.id.desc())
    )
    if search and (q := search.strip()):
        digits = "".join(ch for ch in q if ch.isdigit())
        conditions = [Sale.buyer_name.ilike(f"%{q}%"), Sale.unit.has(Unit.name.ilike(f"%{q}%"))]
        if len(digits) >= 3:
            conditions.append(Sale.buyer_phone.contains(digits))
        query = query.where(or_(*conditions))
    if block:
        query = query.where(Sale.unit.has(Unit.floor.has(Floor.block.has(Block.letter == block))))
    if date_from:
        query = query.where(Sale.sale_date >= date_from)
    if date_to:
        query = query.where(Sale.sale_date <= date_to)
    return [SaleOut.from_sale(s) for s in db.execute(query).unique().scalars().all()]


# ---------- media ----------


@protected.post("/upload")
def upload_image(
    request: Request, subdir: str = "units", file: UploadFile = File(...)
) -> dict[str, str]:
    if subdir not in UPLOAD_SUBDIRS:
        raise HTTPException(status_code=400, detail="Недопустимая папка загрузки")
    return {"url": save_upload(file, subdir, request.headers.get("x-vercel-oidc-token"))}


# ---------- leads ----------


@protected.get("/leads", response_model=list[LeadAdminOut])
def list_leads(processed: bool | None = None, db: Session = Depends(get_db)) -> list[LeadAdminOut]:
    query = (
        select(Lead)
        .options(joinedload(Lead.unit).joinedload(Unit.floor).joinedload(Floor.block))
        .order_by(Lead.created_at.desc(), Lead.id.desc())
    )
    if processed is not None:
        query = query.where(Lead.processed == processed)
    return [LeadAdminOut.from_lead(lead) for lead in db.execute(query).scalars().all()]


@protected.patch("/leads/{lead_id}", response_model=LeadAdminOut)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)) -> LeadAdminOut:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    lead.processed = payload.processed
    db.commit()
    db.refresh(lead)
    return LeadAdminOut.from_lead(lead)


# ---------- settings ----------


@protected.patch("/settings", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)) -> SettingsOut:
    settings_row = db.get(CalculatorSettings, 1)
    if settings_row is None:
        settings_row = CalculatorSettings(id=1)
        db.add(settings_row)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings_row, field, value)
    db.commit()
    db.refresh(settings_row)
    return SettingsOut.model_validate(settings_row)


router.include_router(protected)
