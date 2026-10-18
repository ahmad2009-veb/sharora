from datetime import date, datetime
from decimal import Decimal
from typing import Self

from pydantic import Field, field_validator, model_validator

from app.models import Sale
from app.schemas.common import ORMModel, normalize_tj_phone

Money = Decimal


def _check_name(v: str) -> str:
    v = " ".join(v.split())
    if len(v) < 2:
        raise ValueError("Укажите ФИО покупателя")
    return v


class SaleCreate(ORMModel):
    buyer_name: str = Field(max_length=160)
    buyer_phone: str = Field(max_length=32)
    amount_paid: Money = Field(gt=0, max_digits=14, decimal_places=2)
    total_price: Money | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    sale_date: date = Field(default_factory=date.today)
    comment: str | None = Field(default=None, max_length=2000)

    _name = field_validator("buyer_name")(_check_name)

    @field_validator("buyer_phone")
    @classmethod
    def phone_is_tj(cls, v: str) -> str:
        return normalize_tj_phone(v)

    @model_validator(mode="after")
    def paid_within_total(self) -> Self:
        if self.total_price is not None and self.amount_paid > self.total_price:
            raise ValueError("Сумма оплаты не может превышать общую стоимость")
        return self


class SaleUpdate(ORMModel):
    """Partial edit; the paid ≤ total rule is checked against the merged record in the router."""

    buyer_name: str | None = Field(default=None, max_length=160)
    buyer_phone: str | None = Field(default=None, max_length=32)
    amount_paid: Money | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    total_price: Money | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    sale_date: date | None = None
    comment: str | None = Field(default=None, max_length=2000)

    @field_validator("buyer_name")
    @classmethod
    def name_ok(cls, v: str | None) -> str | None:
        return None if v is None else _check_name(v)

    @field_validator("buyer_phone")
    @classmethod
    def phone_is_tj(cls, v: str | None) -> str | None:
        return None if v is None else normalize_tj_phone(v)


class SaleOut(ORMModel):
    id: int
    unit_id: int | None
    unit_name: str | None
    block_letter: str | None
    floor_label: str | None
    area: float | None
    buyer_name: str
    buyer_phone: str
    amount_paid: float
    total_price: float | None
    remaining: float | None
    sale_date: date
    comment: str | None
    created_by_username: str | None
    created_at: datetime
    updated_at: datetime
    is_archived: bool

    @classmethod
    def from_sale(cls, sale: Sale) -> "SaleOut":
        unit = sale.unit
        floor = unit.floor if unit else None
        total = float(sale.total_price) if sale.total_price is not None else None
        paid = float(sale.amount_paid)
        return cls(
            id=sale.id,
            unit_id=sale.unit_id,
            unit_name=unit.name if unit else None,
            block_letter=floor.block.letter if floor else None,
            floor_label=floor.label if floor else None,
            area=float(unit.area) if unit else None,
            buyer_name=sale.buyer_name,
            buyer_phone=sale.buyer_phone,
            amount_paid=paid,
            total_price=total,
            remaining=round(total - paid, 2) if total is not None else None,
            sale_date=sale.sale_date,
            comment=sale.comment,
            created_by_username=sale.author.username if sale.author else None,
            created_at=sale.created_at,
            updated_at=sale.updated_at,
            is_archived=sale.is_archived,
        )
