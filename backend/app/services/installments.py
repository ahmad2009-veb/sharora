"""Installment schedule maths — the single source for creating and recalculating schedules.

The frontend mirrors this in src/lib/installments.ts for the live preview in the sale modal;
keep the two in step.
"""

import calendar
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import ROUND_FLOOR, ROUND_HALF_UP, Decimal
from typing import Literal

# Tajikistan has no DST: a fixed UTC+5 is exact and needs no tz database (Vercel has none).
TJ_TZ = timezone(timedelta(hours=5))
MAX_TERM_MONTHS = 60
ONE = Decimal(1)


class ScheduleError(ValueError):
    """Terms that cannot produce a schedule; the message is shown to the admin as is."""


def today_tj() -> date:
    return datetime.now(TJ_TZ).date()


def add_months(start: date, months: int) -> date:
    """Same day `months` later; the 31st becomes the last day of a shorter month."""
    index = start.month - 1 + months
    year, month = start.year + index // 12, index % 12 + 1
    return date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def financed_amount(total: Decimal, down: Decimal, markup_percent: Decimal) -> Decimal:
    """Remaining price plus markup, in whole somoni."""
    rest = total - down
    return (rest * (1 + markup_percent / 100)).quantize(ONE, ROUND_HALF_UP)


def check_terms(
    *,
    total: Decimal | None,
    down: Decimal,
    payment_type: str,
    term_months: int | None,
    sale_date: date,
    first_payment_date: date | None,
) -> None:
    """Validation shared by create and edit (Russian messages for the admin)."""
    if total is None:
        raise ScheduleError("Укажите общую стоимость квартиры")
    if down <= 0:
        raise ScheduleError("Первоначальный взнос должен быть больше нуля")
    if down > total:
        raise ScheduleError("Первоначальный взнос не может превышать общую стоимость")
    if payment_type == "full":
        if down != total:
            raise ScheduleError(
                "При полной оплате внесённая сумма должна равняться стоимости квартиры"
            )
        return
    if term_months is None:
        raise ScheduleError("Укажите срок рассрочки")
    if not 1 <= term_months <= MAX_TERM_MONTHS:
        raise ScheduleError(f"Срок рассрочки — от 1 до {MAX_TERM_MONTHS} месяцев")
    if down == total:
        raise ScheduleError("Остаток равен нулю — выберите «Полная оплата»")
    if first_payment_date is not None and first_payment_date < sale_date:
        raise ScheduleError("Дата первого платежа не может быть раньше даты продажи")


@dataclass(frozen=True)
class PaidRow:
    """A payment that already has money on it; recalculation keeps it."""

    due_date: date
    paid_amount: Decimal


@dataclass(frozen=True)
class PlannedRow:
    number: int
    due_date: date
    amount: Decimal
    paid_amount: Decimal = Decimal(0)


def build_schedule(
    debt: Decimal,
    term_months: int,
    first_payment_date: date,
    paid: list[PaidRow] | None = None,
) -> list[PlannedRow]:
    """Equal monthly payments in whole somoni; the last one absorbs the rounding difference.

    `paid` rows (in order) keep their date and are closed at the amount actually paid —
    the unpaid rest of a partly paid row moves into the regenerated part. New rows take
    positions len(paid)+1 … term_months and are dated from `first_payment_date`.
    """
    paid = paid or []
    if term_months < 1 or term_months > MAX_TERM_MONTHS:
        raise ScheduleError(f"Срок рассрочки — от 1 до {MAX_TERM_MONTHS} месяцев")
    rows = [
        PlannedRow(
            number=i + 1, due_date=p.due_date, amount=p.paid_amount, paid_amount=p.paid_amount
        )
        for i, p in enumerate(paid)
    ]
    count = term_months - len(paid)
    rest = debt - sum((p.paid_amount for p in paid), Decimal(0))
    if rest < 0:
        raise ScheduleError("Уже оплачено больше, чем новая сумма долга")
    if rest == 0:
        return rows
    if count < 1:
        raise ScheduleError(f"Срок должен быть больше числа уже оплаченных платежей ({len(paid)})")

    monthly = (rest / count).quantize(ONE, ROUND_HALF_UP)
    if monthly * (count - 1) >= rest:  # rounding up would leave nothing for the last payment
        monthly = (rest / count).quantize(ONE, ROUND_FLOOR)
    if monthly <= 0:
        raise ScheduleError("Остаток слишком мал для такого срока рассрочки")
    last = rest - monthly * (count - 1)
    start = len(paid)
    for i in range(count):
        rows.append(
            PlannedRow(
                number=start + i + 1,
                due_date=add_months(first_payment_date, start + i),
                amount=last if i == count - 1 else monthly,
            )
        )
    return rows


def payment_status(
    amount: Decimal, paid_amount: Decimal, due_date: date, today: date
) -> Literal["paid", "overdue", "pending"]:
    """paid | overdue | pending. Overdue depends on today, so it is never stored."""
    if paid_amount >= amount:
        return "paid"
    return "overdue" if due_date < today else "pending"
