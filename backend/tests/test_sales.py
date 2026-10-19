import io
import json
from datetime import date

import pytest
from docx import Document
from fastapi.testclient import TestClient
from openpyxl import load_workbook

BUYER = {
    "buyer_name": "Раҳмонов Исмоил",
    "buyer_phone": "+992 93 123 4567",
    "total_price": 650000,
    "down_payment": 250000,
    "sale_date": "2026-10-18",
    "comment": "Договор №17",
    "payment_type": "installment",
    "term_months": 24,
}


def free_unit(client: TestClient) -> dict:
    return client.get("/api/units", params={"status": "free"}).json()[0]


def test_sell_flow(admin_client: TestClient) -> None:
    unit = free_unit(admin_client)
    res = admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=BUYER)
    assert res.status_code == 201
    sale = res.json()
    assert sale["buyer_phone"] == "+992931234567"
    assert sale["remaining"] == 400000
    assert sale["created_by_username"] == "admin"
    assert sale["block_letter"] == unit["block_letter"]

    assert admin_client.get(f"/api/units/{unit['id']}").json()["status"] == "sold"
    current = admin_client.get(f"/api/admin/units/{unit['id']}/sale").json()
    assert current["id"] == sale["id"]

    again = admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=BUYER)
    assert again.status_code == 409


def test_generic_status_endpoints_reject_sold(admin_client: TestClient) -> None:
    unit = free_unit(admin_client)
    res = admin_client.patch(f"/api/admin/units/{unit['id']}/status", json={"status": "sold"})
    assert res.status_code == 400
    assert res.json()["detail"] == "Используйте /sell с данными покупателя"
    res = admin_client.patch(f"/api/admin/units/{unit['id']}", json={"status": "sold"})
    assert res.status_code == 400
    assert admin_client.get(f"/api/units/{unit['id']}").json()["status"] == "free"


def test_cancelled_sale_leaves_unit_untouched(admin_client: TestClient) -> None:
    """The modal's «Отмена» sends nothing; an invalid submit must not change anything either."""
    unit = free_unit(admin_client)
    bad = {**BUYER, "down_payment": 700000}  # more than the total
    res = admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=bad)
    assert res.status_code == 422
    assert admin_client.get(f"/api/units/{unit['id']}").json()["status"] == "free"
    assert admin_client.get(f"/api/admin/units/{unit['id']}/sale").status_code == 404


def test_sale_validation(admin_client: TestClient) -> None:
    unit = free_unit(admin_client)
    url = f"/api/admin/units/{unit['id']}/sell"
    assert (
        admin_client.post(url, json={**BUYER, "buyer_phone": "+7 999 1234567"}).status_code == 422
    )
    assert admin_client.post(url, json={**BUYER, "down_payment": 0}).status_code == 422
    assert admin_client.post(url, json={**BUYER, "buyer_name": " "}).status_code == 422
    no_total = {k: v for k, v in BUYER.items() if k != "total_price"}
    assert admin_client.post(url, json=no_total).status_code == 422
    no_term = {k: v for k, v in BUYER.items() if k != "term_months"}
    res = admin_client.post(url, json=no_term)
    assert res.status_code == 422
    assert "Укажите срок рассрочки" in res.json()["detail"][0]["msg"]
    assert admin_client.post(url, json={**BUYER, "term_months": 61}).status_code == 422
    # Full payment means the whole price is paid now.
    full = {**BUYER, "payment_type": "full", "term_months": None}
    assert admin_client.post(url, json=full).status_code == 422
    early = {**BUYER, "first_payment_date": "2026-10-01"}
    assert admin_client.post(url, json=early).status_code == 422
    assert admin_client.get(f"/api/admin/units/{unit['id']}/sale").status_code == 404
    res = admin_client.post(url, json={**full, "down_payment": 650000})
    assert res.status_code == 201
    assert res.json()["remaining"] == 0 and res.json()["financed_amount"] == 0


def test_edit_sale(admin_client: TestClient) -> None:
    unit = free_unit(admin_client)
    sale = admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=BUYER).json()
    res = admin_client.patch(
        f"/api/admin/sales/{sale['id']}",
        json={"down_payment": 650000, "payment_type": "full", "comment": "Оплачено"},
    )
    assert res.status_code == 200
    assert res.json()["remaining"] == 0
    assert res.json()["term_months"] is None
    assert admin_client.get(f"/api/admin/sales/{sale['id']}/schedule").json()["payments"] == []
    too_much = admin_client.patch(f"/api/admin/sales/{sale['id']}", json={"down_payment": 700000})
    assert too_much.status_code == 422


def test_unsold_archives_sale(admin_client: TestClient) -> None:
    unit = free_unit(admin_client)
    admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=BUYER)
    res = admin_client.patch(f"/api/admin/units/{unit['id']}/status", json={"status": "reserved"})
    assert res.json()["status"] == "reserved"
    assert admin_client.get(f"/api/admin/units/{unit['id']}/sale").status_code == 404
    assert admin_client.get("/api/admin/sales").json() == []
    archived = admin_client.get("/api/admin/sales", params={"archived": True}).json()
    assert len(archived) == 1 and archived[0]["is_archived"] is True

    # It can be sold again; the archive keeps the earlier record.
    assert admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=BUYER).status_code == 201
    assert len(admin_client.get("/api/admin/sales").json()) == 1


def test_sales_list_filters(admin_client: TestClient) -> None:
    units = admin_client.get("/api/units", params={"status": "free"}).json()
    a = next(u for u in units if u["block_letter"] == "1")
    b = next(u for u in units if u["block_letter"] == "2")
    admin_client.post(f"/api/admin/units/{a['id']}/sell", json=BUYER)
    admin_client.post(
        f"/api/admin/units/{b['id']}/sell",
        json={
            **BUYER,
            "buyer_name": "Саидов Рустам",
            "buyer_phone": "+992900000002",
            "sale_date": "2026-09-01",
        },
    )
    assert len(admin_client.get("/api/admin/sales").json()) == 2
    assert [
        s["unit_id"] for s in admin_client.get("/api/admin/sales", params={"block": "2"}).json()
    ] == [b["id"]]
    assert len(admin_client.get("/api/admin/sales", params={"search": "Саидов"}).json()) == 1
    assert len(admin_client.get("/api/admin/sales", params={"search": "0000002"}).json()) == 1
    since = admin_client.get("/api/admin/sales", params={"date_from": "2026-10-01"}).json()
    assert [s["unit_id"] for s in since] == [a["id"]]


def test_public_api_never_exposes_buyer(admin_client: TestClient) -> None:
    unit = free_unit(admin_client)
    admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=BUYER)
    admin_client.post("/api/admin/logout")

    detail = admin_client.get(f"/api/units/{unit['id']}").json()
    floor_units = admin_client.get(f"/api/floors/{detail['floor_id']}/units").json()
    search = admin_client.get("/api/units", params={"status": "sold"}).json()
    for payload in (detail, floor_units, search):
        text = json.dumps(payload, ensure_ascii=False)
        for secret in (
            "Раҳмонов",
            "931234567",
            "250000",
            "16667",
            "Договор",
            "buyer",
            "sale",
            "payment",
            "installment",
        ):
            assert secret not in text


def test_sales_endpoints_require_auth(client: TestClient) -> None:
    assert client.post("/api/admin/units/1/sell", json=BUYER).status_code == 401
    assert client.get("/api/admin/units/1/sale").status_code == 401
    assert client.patch("/api/admin/sales/1", json={"comment": "x"}).status_code == 401
    assert client.get("/api/admin/sales").status_code == 401
    assert client.get("/api/admin/sales/1/schedule").status_code == 401
    assert (
        client.post(
            "/api/admin/payments/1/pay", json={"amount": 1, "paid_date": "2026-10-19"}
        ).status_code
        == 401
    )
    assert client.post("/api/admin/payments/1/reset").status_code == 401
    assert client.get("/api/admin/payments/overdue").status_code == 401
    assert client.get("/api/admin/sales/1/export.xlsx").status_code == 401
    assert client.get("/api/admin/sales/1/export.docx").status_code == 401


@pytest.fixture
def fixed_today(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pins «today» for overdue checks to 2027-01-10."""
    import app.routers.admin as admin_router
    import app.services.schedule_export as export

    for module in (admin_router, export):
        monkeypatch.setattr(module, "today_tj", lambda: date(2027, 1, 10))


def sell_installment(client: TestClient, **extra: object) -> dict:
    unit = free_unit(client)
    body = {**BUYER, "term_months": 12, **extra}
    res = client.post(f"/api/admin/units/{unit['id']}/sell", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def test_sell_creates_schedule(admin_client: TestClient, fixed_today: None) -> None:
    sale = sell_installment(admin_client)
    # 400 000 over 12 months: 33 333 × 11 + 33 337.
    assert sale["financed_amount"] == 400000
    assert sale["monthly_payment"] == 33333
    assert sale["first_payment_date"] == "2026-11-18"  # one month after the sale
    schedule = admin_client.get(f"/api/admin/sales/{sale['id']}/schedule").json()
    rows = schedule["payments"]
    assert [r["number"] for r in rows] == list(range(1, 13))
    assert rows[0]["due_date"] == "2026-11-18" and rows[-1]["due_date"] == "2027-10-18"
    assert rows[-1]["amount"] == 33337
    assert sum(r["amount"] for r in rows) == 400000
    assert rows[0]["balance_after"] == 400000 - 33333 and rows[-1]["balance_after"] == 0
    # Due 2026-11-18 and 2026-12-18 are before the pinned today.
    assert [r["status"] for r in rows[:3]] == ["overdue", "overdue", "pending"]
    assert schedule["sale"]["overdue_count"] == 2
    assert admin_client.get("/api/admin/payments/overdue").json() == {
        "count": 2,
        "amount": 66666,
        "sales": 1,
    }


def test_markup(admin_client: TestClient) -> None:
    sale = sell_installment(admin_client, markup_percent=10)
    assert sale["financed_amount"] == 440000
    assert sale["remaining"] == 440000


def test_pay_partial_and_full(admin_client: TestClient, fixed_today: None) -> None:
    sale = sell_installment(admin_client)
    first = admin_client.get(f"/api/admin/sales/{sale['id']}/schedule").json()["payments"][0]
    url = f"/api/admin/payments/{first['id']}/pay"

    res = admin_client.post(url, json={"amount": 10000, "paid_date": "2026-11-20"})
    assert res.status_code == 200
    row = res.json()["payments"][0]
    assert (row["paid_amount"], row["status"]) == (10000, "overdue")
    assert res.json()["sale"]["remaining"] == 390000
    assert res.json()["sale"]["next_payment_amount"] == 23333

    too_much = admin_client.post(url, json={"amount": 30000, "paid_date": "2026-11-21"})
    assert too_much.status_code == 422
    future = admin_client.post(url, json={"amount": 1, "paid_date": "2027-02-01"})
    assert future.status_code == 422

    res = admin_client.post(url, json={"amount": 23333, "paid_date": "2026-11-25"})
    data = res.json()
    assert data["payments"][0]["status"] == "paid"
    assert data["payments"][0]["paid_date"] == "2026-11-25"
    assert data["sale"]["remaining"] == 400000 - 33333
    assert data["sale"]["paid_total"] == 250000 + 33333
    assert data["sale"]["overdue_count"] == 1
    assert data["sale"]["next_payment_date"] == "2026-12-18"
    assert admin_client.post(url, json={"amount": 1, "paid_date": "2026-11-25"}).status_code == 409

    res = admin_client.post(f"/api/admin/payments/{first['id']}/reset")
    assert res.json()["payments"][0]["paid_amount"] == 0
    assert res.json()["sale"]["remaining"] == 400000


def test_recalculate_keeps_paid_rows(admin_client: TestClient) -> None:
    sale = sell_installment(admin_client)
    rows = admin_client.get(f"/api/admin/sales/{sale['id']}/schedule").json()["payments"]
    admin_client.post(
        f"/api/admin/payments/{rows[0]['id']}/pay",
        json={"amount": 33333, "paid_date": "2026-10-19"},
    )
    admin_client.post(
        f"/api/admin/payments/{rows[1]['id']}/pay", json={"amount": 3000, "paid_date": "2026-10-19"}
    )

    res = admin_client.patch(f"/api/admin/sales/{sale['id']}", json={"term_months": 6})
    assert res.status_code == 200, res.text
    new = admin_client.get(f"/api/admin/sales/{sale['id']}/schedule").json()["payments"]
    assert len(new) == 6
    assert new[0]["id"] == rows[0]["id"] and new[0]["amount"] == 33333
    # The partly paid row is closed at what was paid; its rest moves into the new rows.
    assert new[1]["id"] == rows[1]["id"] and new[1]["amount"] == 3000
    assert new[1]["status"] == "paid"
    rest = 400000 - 33333 - 3000
    assert sum(r["amount"] for r in new[2:]) == rest
    assert new[2]["amount"] == round(rest / 4)
    assert [r["due_date"] for r in new[2:]] == [
        "2027-01-18",
        "2027-02-18",
        "2027-03-18",
        "2027-04-18",
    ]

    # Cannot go below the number of rows that already have money on them.
    assert (
        admin_client.patch(f"/api/admin/sales/{sale['id']}", json={"term_months": 2}).status_code
        == 422
    )
    # Nor switch to full payment once the schedule has payments.
    full = {"payment_type": "full", "down_payment": 650000}
    assert admin_client.patch(f"/api/admin/sales/{sale['id']}", json=full).status_code == 422
    # A comment-only edit leaves the schedule alone.
    admin_client.patch(f"/api/admin/sales/{sale['id']}", json={"comment": "ok"})
    again = admin_client.get(f"/api/admin/sales/{sale['id']}/schedule").json()["payments"]
    assert [r["id"] for r in again] == [r["id"] for r in new]


def test_sales_list_overdue_filter(admin_client: TestClient, fixed_today: None) -> None:
    sale = sell_installment(admin_client)
    sell_installment(admin_client, first_payment_date="2027-02-01")
    assert len(admin_client.get("/api/admin/sales").json()) == 2
    overdue = admin_client.get("/api/admin/sales", params={"overdue": True}).json()
    assert [s["id"] for s in overdue] == [sale["id"]]


def test_archived_sale_drops_out_of_overdue(admin_client: TestClient, fixed_today: None) -> None:
    sale = sell_installment(admin_client)
    admin_client.patch(f"/api/admin/units/{sale['unit_id']}/status", json={"status": "free"})
    assert admin_client.get("/api/admin/payments/overdue").json()["count"] == 0
    first = admin_client.get(f"/api/admin/sales/{sale['id']}/schedule").json()["payments"][0]
    res = admin_client.post(
        f"/api/admin/payments/{first['id']}/pay", json={"amount": 1, "paid_date": "2026-11-20"}
    )
    assert res.status_code == 409


def test_exports(admin_client: TestClient, fixed_today: None) -> None:
    sale = sell_installment(admin_client)
    res = admin_client.get(f"/api/admin/sales/{sale['id']}/export.xlsx")
    assert res.status_code == 200
    name = (
        f"grafik_Blok{sale['block_letter']}_Etazh{sale['floor_number']}_"
        f"{sale['unit_name'].replace(' ', '').replace('Х', 'Kh').replace('М', 'M')}"
    )
    disposition = res.headers["content-disposition"]
    assert "grafik_Blok" in disposition and disposition.endswith('_Rahmonov.xlsx"')
    assert name.split("_")[1] in disposition
    ws = load_workbook(io.BytesIO(res.content)).active
    cells = [c for row in ws.iter_rows(values_only=True) for c in row if c is not None]
    assert "Zarafshon Sokhtmon" in cells
    assert "Раҳмонов Исмоил" in cells
    assert "Итого" in cells and 400000 in cells
    assert cells.count("Просрочено") == 2
    assert int(ws.page_setup.paperSize) == 9  # A4

    res = admin_client.get(f"/api/admin/sales/{sale['id']}/export.docx")
    assert res.status_code == 200
    assert res.headers["content-disposition"].endswith('_Rahmonov.docx"')
    doc = Document(io.BytesIO(res.content))
    text = "\n".join(p.text for p in doc.paragraphs)
    assert "График платежей по договору рассрочки" in text
    cells_text = [c.text for t in doc.tables for r in t.rows for c in r.cells]
    assert "Продавец ______________" in cells_text
    assert "Покупатель ______________" in cells_text
    assert "33 337 смн" in cells_text
    assert len(doc.tables[1].rows) == 1 + 12 + 1  # header, payments, totals
