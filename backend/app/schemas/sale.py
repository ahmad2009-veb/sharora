from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models import InstallmentPayment, Sale
from app.schemas.common import ORMModel, normalize_tj_phone
from app.services.installments import (
    MAX_TERM_MONTHS,
    ScheduleError,
    check_terms,
    payment_status,
)

Money = Decimal
PaymentType = Literal["full", "installment"]
PaymentStatus = Literal["pending", "paid", "overdue"]


def _check_name(v: str) -> str:
    v = " ".join(v.split())
    if len(v) < 2:
        raise ValueError("Укажите ФИО покупателя")
    return v


class SaleCreate(ORMModel):
    buyer_name: str = Field(max_length=160)
    buyer_phone: str = Field(max_length=32)
    total_price: Money = Field(gt=0, max_digits=14, decimal_places=2)
    down_payment: Money = Field(gt=0, max_digits=14, decimal_places=2)
    sale_date: date = Field(default_factory=date.today)
    comment: str | None = Field(default=None, max_length=2000)
    payment_type: PaymentType = "full"
    term_months: int | None = Field(default=None, ge=1, le=MAX_TERM_MONTHS)
    markup_percent: Money = Field(default=Decimal(0), ge=0, le=100, decimal_places=2)
    # Defaults to one month after the sale date.
    first_payment_date: date | None = None

    _name = field_validator("buyer_name")(_check_name)

    @field_validator("buyer_phone")
    @classmethod
    def phone_is_tj(cls, v: str) -> str:
        return normalize_tj_phone(v)

    @model_validator(mode="after")
    def terms_ok(self) -> Self:
        try:
            check_terms(
                total=self.total_price,
                down=self.down_payment,
                payment_type=self.payment_type,
                term_months=self.term_months,
                sale_date=self.sale_date,
                first_payment_date=self.first_payment_date,
            )
        except ScheduleError as e:
            raise ValueError(str(e)) from None
        return self


# Changing any of these regenerates the unpaid part of the schedule.
TERM_FIELDS = (
    "total_price",
    "down_payment",
    "payment_type",
    "term_months",
    "markup_percent",
    "first_payment_date",
)


class SaleUpdate(ORMModel):
    """Partial edit; the payment terms are checked against the merged record in the router."""

    buyer_name: str | None = Field(default=None, max_length=160)
    buyer_phone: str | None = Field(default=None, max_length=32)
    total_price: Money | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    down_payment: Money | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    sale_date: date | None = None
    comment: str | None = Field(default=None, max_length=2000)
    payment_type: PaymentType | None = None
    term_months: int | None = Field(default=None, ge=1, le=MAX_TERM_MONTHS)
    markup_percent: Money | None = Field(default=None, ge=0, le=100, decimal_places=2)
    first_payment_date: date | None = None

    @field_validator("buyer_name")
    @classmethod
    def name_ok(cls, v: str | None) -> str | None:
        return None if v is None else _check_name(v)

    @field_validator("buyer_phone")
    @classmethod
    def phone_is_tj(cls, v: str | None) -> str | None:
        return None if v is None else normalize_tj_phone(v)


class PaymentIn(BaseModel):
    """Money received for one schedule row; added to what was already paid on it."""

    amount: Money = Field(gt=0, max_digits=14, decimal_places=2)
    paid_date: date


class PaymentOut(ORMModel):
    id: int
    number: int
    due_date: date
    amount: float
    paid_amount: float
    paid_date: date | None
    status: PaymentStatus
    # Planned debt after this payment (like a bank schedule), not the actual balance.
    balance_after: float


class SaleOut(ORMModel):
    id: int
    unit_id: int | None
    unit_name: str | None
    block_letter: str | None
    floor_label: str | None
    floor_number: int | None
    area: float | None
    buyer_name: str
    buyer_phone: str
    total_price: float | None
    down_payment: float
    payment_type: PaymentType
    term_months: int | None
    markup_percent: float
    first_payment_date: date | None
    # Sum of the schedule (rest + markup); 0 for full payment.
    financed_amount: float
    monthly_payment: float | None
    # Down payment plus everything received on the schedule.
    paid_total: float
    # Debt still to be received; None for legacy sales without a total price.
    remaining: float | None
    next_payment_date: date | None
    next_payment_amount: float | None
    overdue_count: int
    overdue_amount: float
    sale_date: date
    comment: str | None
    created_by_username: str | None
    created_at: datetime
    updated_at: datetime
    is_archived: bool

    @classmethod
    def from_sale(cls, sale: Sale, today: date) -> "SaleOut":
        unit = sale.unit
        floor = unit.floor if unit else None
        payments = sale.payments
        financed = sum((p.amount for p in payments), Decimal(0))
        received = sum((p.paid_amount for p in payments), Decimal(0))
        open_rows = [p for p in payments if p.paid_amount < p.amount]
        overdue = [p for p in open_rows if p.due_date < today]
        if sale.payment_type == "installment":
            remaining: Decimal | None = financed - received
        elif sale.total_price is not None:
            remaining = sale.total_price - sale.down_payment
        else:
            remaining = None
        nxt = open_rows[0] if open_rows else None
        return cls(
            id=sale.id,
            unit_id=sale.unit_id,
            unit_name=unit.name if unit else None,
            block_letter=floor.block.letter if floor else None,
            floor_label=floor.label if floor else None,
            floor_number=floor.number if floor else None,
            area=float(unit.area) if unit else None,
            buyer_name=sale.buyer_name,
            buyer_phone=sale.buyer_phone,
            total_price=float(sale.total_price) if sale.total_price is not None else None,
            down_payment=float(sale.down_payment),
            payment_type="installment" if sale.payment_type == "installment" else "full",
            term_months=sale.term_months,
            markup_percent=float(sale.markup_percent),
            first_payment_date=sale.first_payment_date,
            financed_amount=float(financed),
            monthly_payment=float(payments[0].amount) if payments else None,
            paid_total=float(sale.down_payment + received),
            remaining=float(remaining) if remaining is not None else None,
            next_payment_date=nxt.due_date if nxt else None,
            next_payment_amount=float(nxt.amount - nxt.paid_amount) if nxt else None,
            overdue_count=len(overdue),
            overdue_amount=float(sum((p.amount - p.paid_amount for p in overdue), Decimal(0))),
            sale_date=sale.sale_date,
            comment=sale.comment,
            created_by_username=sale.author.username if sale.author else None,
            created_at=sale.created_at,
            updated_at=sale.updated_at,
            is_archived=sale.is_archived,
        )


def payments_out(payments: list[InstallmentPayment], today: date) -> list[PaymentOut]:
    balance = sum((p.amount for p in payments), Decimal(0))
    rows: list[PaymentOut] = []
    for p in payments:
        balance -= p.amount
        rows.append(
            PaymentOut(
                id=p.id,
                number=p.number,
                due_date=p.due_date,
                amount=float(p.amount),
                paid_amount=float(p.paid_amount),
                paid_date=p.paid_date,
                status=payment_status(p.amount, p.paid_amount, p.due_date, today),
                balance_after=float(balance),
            )
        )
    return rows


class ScheduleOut(BaseModel):
    sale: SaleOut
    payments: list[PaymentOut]


class OverdueSummary(BaseModel):
    count: int
    amount: float
    sales: int
