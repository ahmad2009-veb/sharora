import json

from fastapi.testclient import TestClient

BUYER = {
    "buyer_name": "Раҳмонов Исмоил",
    "buyer_phone": "+992 93 123 4567",
    "amount_paid": 250000,
    "total_price": 650000,
    "sale_date": "2026-10-18",
    "comment": "Рассрочка 24 мес.",
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
    bad = {**BUYER, "amount_paid": 700000}  # more than the total
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
    assert admin_client.post(url, json={**BUYER, "amount_paid": 0}).status_code == 422
    assert admin_client.post(url, json={**BUYER, "buyer_name": " "}).status_code == 422
    no_total = {k: v for k, v in BUYER.items() if k != "total_price"}
    assert admin_client.post(url, json=no_total).status_code == 201


def test_edit_sale(admin_client: TestClient) -> None:
    unit = free_unit(admin_client)
    sale = admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=BUYER).json()
    res = admin_client.patch(
        f"/api/admin/sales/{sale['id']}", json={"amount_paid": 650000, "comment": "Оплачено"}
    )
    assert res.status_code == 200
    assert res.json()["remaining"] == 0
    too_much = admin_client.patch(f"/api/admin/sales/{sale['id']}", json={"amount_paid": 700000})
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
    a = next(u for u in units if u["block_letter"] == "А")
    b = next(u for u in units if u["block_letter"] == "Б")
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
        s["unit_id"] for s in admin_client.get("/api/admin/sales", params={"block": "Б"}).json()
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
        for secret in ("Раҳмонов", "931234567", "250000", "Рассрочка 24", "buyer", "sale"):
            assert secret not in text


def test_sales_endpoints_require_auth(client: TestClient) -> None:
    assert client.post("/api/admin/units/1/sell", json=BUYER).status_code == 401
    assert client.get("/api/admin/units/1/sale").status_code == 401
    assert client.patch("/api/admin/sales/1", json={"comment": "x"}).status_code == 401
    assert client.get("/api/admin/sales").status_code == 401
