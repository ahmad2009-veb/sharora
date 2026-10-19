from fastapi.testclient import TestClient

BUYER = {
    "buyer_name": "Раҳмонов Исмоил",
    "buyer_phone": "+992 93 123 4567",
    "amount_paid": 250000,
    "total_price": 650000,
    "sale_date": "2026-10-18",
    "comment": "Рассрочка 24 мес.",
}


def test_admin_requires_auth(client: TestClient) -> None:
    assert client.get("/api/admin/units").status_code == 401
    assert client.patch("/api/admin/units/1/status", json={"status": "sold"}).status_code == 401


def test_login_with_wrong_password(client: TestClient) -> None:
    res = client.post("/api/admin/login", json={"username": "admin", "password": "nope"})
    assert res.status_code == 401


def test_login_sets_httponly_cookie(client: TestClient) -> None:
    res = client.post("/api/admin/login", json={"username": "admin", "password": "test-password"})
    assert "httponly" in res.headers["set-cookie"].lower()
    assert client.get("/api/admin/me").json()["username"] == "admin"


def test_status_change_updates_stats(admin_client: TestClient) -> None:
    unit = admin_client.get("/api/units", params={"status": "free"}).json()[0]
    before = admin_client.get("/api/stats").json()
    res = admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=BUYER)
    assert res.status_code == 201
    assert admin_client.get(f"/api/units/{unit['id']}").json()["status"] == "sold"
    after = admin_client.get("/api/stats").json()
    assert after["free"] == before["free"] - 1
    assert after["sold"] == before["sold"] + 1


def test_update_unit_price_and_polygon(admin_client: TestClient) -> None:
    payload = {
        "price_per_m2": 7500,
        "area": 76.1,
        "polygon": [{"x": 1, "y": 1}, {"x": 9, "y": 1}, {"x": 9, "y": 9}],
    }
    res = admin_client.patch("/api/admin/units/3", json=payload)
    assert res.status_code == 200
    assert res.json()["price_per_m2"] == 7500
    assert len(res.json()["polygon"]) == 3


def test_polygon_outside_plan_is_rejected(admin_client: TestClient) -> None:
    res = admin_client.patch("/api/admin/units/3", json={"polygon": [{"x": 150, "y": 0}]})
    assert res.status_code == 422


def test_admin_unit_filters(admin_client: TestClient) -> None:
    units = admin_client.get("/api/admin/units", params={"block": "2", "floor": 5}).json()
    assert len(units) == 7
    assert {u["block_letter"] for u in units} == {"2"}


def test_leads_listing_and_processing(admin_client: TestClient) -> None:
    admin_client.post(
        "/api/leads", json={"name": "Нилуфар", "phone": "+992900000001", "unit_id": 2}
    )
    leads = admin_client.get("/api/admin/leads").json()
    assert leads[0]["unit_label"] == "Блок 1 · Этаж 2 · Хонаи 1"
    res = admin_client.patch(f"/api/admin/leads/{leads[0]['id']}", json={"processed": True})
    assert res.json()["processed"] is True
    assert admin_client.get("/api/admin/leads", params={"processed": False}).json() == []


def test_update_settings(admin_client: TestClient) -> None:
    res = admin_client.patch("/api/admin/settings", json={"default_price_per_m2": 7000})
    assert res.json()["default_price_per_m2"] == 7000
    assert admin_client.get("/api/settings").json()["default_price_per_m2"] == 7000


def test_upload_rejects_non_images(admin_client: TestClient) -> None:
    res = admin_client.post(
        "/api/admin/upload?subdir=floors", files={"file": ("x.png", b"not an image", "image/png")}
    )
    assert res.status_code == 400


def test_add_and_remove_unit_on_a_floor(admin_client: TestClient) -> None:
    floor = admin_client.get("/api/blocks/1/floors").json()[3]
    new = {"floor_id": floor["id"], "name": "Хонаи 8", "number": 8, "area": 50, "rooms": 2}
    unit = admin_client.post("/api/admin/units", json=new).json()
    assert len(admin_client.get(f"/api/floors/{floor['id']}/units").json()["units"]) == 8

    assert admin_client.delete(f"/api/admin/units/{unit['id']}").status_code == 204
    assert len(admin_client.get(f"/api/floors/{floor['id']}/units").json()["units"]) == 7

    sold = {**new, "status": "sold"}
    assert admin_client.post("/api/admin/units", json=sold).status_code == 400


def test_sold_unit_cannot_be_removed(admin_client: TestClient) -> None:
    unit = admin_client.get("/api/units", params={"status": "free"}).json()[0]
    buyer = {"buyer_name": "Нодира", "buyer_phone": "+992931112233", "amount_paid": 1000}
    buyer["sale_date"] = "2026-10-19"
    assert admin_client.post(f"/api/admin/units/{unit['id']}/sell", json=buyer).status_code == 201
    assert admin_client.delete(f"/api/admin/units/{unit['id']}").status_code == 409
