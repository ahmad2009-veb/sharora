from datetime import date
from decimal import Decimal

import pytest

from app.services.installments import (
    PaidRow,
    ScheduleError,
    add_months,
    build_schedule,
    financed_amount,
    payment_status,
)
from app.services.schedule_export import translit

D = Decimal


@pytest.mark.parametrize(
    ("debt", "term", "monthly", "last"),
    [
        (D(400000), 6, D(66667), D(66665)),
        (D(400000), 12, D(33333), D(33337)),
        (D(400000), 24, D(16667), D(16659)),
        (D(120000), 12, D(10000), D(10000)),
    ],
)
def test_equal_payments_last_absorbs_rounding(
    debt: Decimal, term: int, monthly: Decimal, last: Decimal
) -> None:
    rows = build_schedule(debt, term, date(2026, 11, 18))
    assert len(rows) == term
    assert [r.number for r in rows] == list(range(1, term + 1))
    assert all(r.amount == monthly for r in rows[:-1])
    assert rows[-1].amount == last
    assert sum(r.amount for r in rows) == debt


def test_rounding_up_never_empties_the_last_payment() -> None:
    rows = build_schedule(D(23), 12, date(2026, 1, 1))
    assert sum(r.amount for r in rows) == 23 and all(r.amount > 0 for r in rows)
    rows = build_schedule(D(11), 2, date(2026, 1, 1))  # 5.5 → 6 → last 5
    assert [r.amount for r in rows] == [6, 5]
    rows = build_schedule(D(7), 4, date(2026, 1, 1))  # 1.75 → 2, last 1
    assert [r.amount for r in rows] == [2, 2, 2, 1]
    rows = build_schedule(D(8), 5, date(2026, 1, 1))  # 1.6 → 2 would leave 0 → floor 1, last 4
    assert [r.amount for r in rows] == [1, 1, 1, 1, 4]
    with pytest.raises(ScheduleError):
        build_schedule(D(3), 6, date(2026, 1, 1))


def test_month_end_dates() -> None:
    rows = build_schedule(D(1200), 12, date(2026, 1, 31))
    assert [r.due_date for r in rows[:4]] == [
        date(2026, 1, 31),
        date(2026, 2, 28),
        date(2026, 3, 31),
        date(2026, 4, 30),
    ]
    assert rows[-1].due_date == date(2026, 12, 31)
    assert add_months(date(2027, 12, 31), 2) == date(2028, 2, 29)  # leap year
    assert add_months(date(2026, 11, 18), 1) == date(2026, 12, 18)
    assert add_months(date(2026, 12, 18), 1) == date(2027, 1, 18)


def test_markup_rounds_to_whole_somoni() -> None:
    assert financed_amount(D(650000), D(250000), D(0)) == 400000
    assert financed_amount(D(650000), D(250000), D(10)) == 440000
    assert financed_amount(D(1000), D(1), D("2.5")) == 1024  # 1023.975


def test_regeneration_keeps_paid_rows() -> None:
    paid = [PaidRow(date(2026, 11, 18), D(33333)), PaidRow(date(2026, 12, 18), D(5000))]
    rows = build_schedule(D(400000), 12, date(2026, 11, 18), paid)
    assert [(r.number, r.amount, r.paid_amount) for r in rows[:2]] == [
        (1, D(33333), D(33333)),
        (2, D(5000), D(5000)),
    ]
    assert len(rows) == 12
    assert rows[2].due_date == date(2027, 1, 18)
    assert sum(r.amount for r in rows) == 400000
    with pytest.raises(ScheduleError):
        build_schedule(D(400000), 2, date(2026, 11, 18), paid)
    with pytest.raises(ScheduleError):
        build_schedule(D(1000), 12, date(2026, 11, 18), paid)


def test_status() -> None:
    today = date(2026, 12, 1)
    assert payment_status(D(100), D(100), date(2026, 11, 1), today) == "paid"
    assert payment_status(D(100), D(40), date(2026, 11, 1), today) == "overdue"
    assert payment_status(D(100), D(0), date(2026, 12, 1), today) == "pending"  # due today
    assert payment_status(D(100), D(0), date(2026, 12, 2), today) == "pending"


def test_translit() -> None:
    assert translit("Хонаи 5") == "Khonai5"
    assert translit("Раҳмонов") == "Rahmonov"
    assert translit("Мағоза 1") == "Maghoza1"
    assert translit("Қодирова-Ҷӯраева") == "QodirovaJuraeva"
