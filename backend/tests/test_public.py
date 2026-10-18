from fastapi.testclient import TestClient


def test_stats_counts_every_unit(client: TestClient) -> None:
    stats = client.get("/api/stats").json()
    assert stats["total"] == 12 * (2 + 9 * 8)
    assert stats["free"] + stats["reserved"] + stats["sold"] == stats["total"]


def test_blocks_are_ordered_with_free_counts(client: TestClient) -> None:
    blocks = client.get("/api/blocks").json()
    assert [b["letter"] for b in blocks] == list("АБВГДЕЖИКЛМН")
    assert all(0 <= b["free_count"] <= b["total_count"] == 74 for b in blocks)


def test_block_floors(client: TestClient) -> None:
    floors = client.get("/api/blocks/А/floors").json()
    assert [f["label"] for f in floors[:3]] == ["-1 Мағоза", "Мағоза 1", "Этаж 2"]
    assert [f["number"] for f in floors] == [-1, 1, *range(2, 11)]
    assert floors[0]["kind"] == "commercial"


def test_unknown_block_returns_404(client: TestClient) -> None:
    assert client.get("/api/blocks/Я/floors").status_code == 404


def test_floor_units_have_areas_and_polygons(client: TestClient) -> None:
    floor = client.get("/api/blocks/А/floors").json()[2]
    data = client.get(f"/api/floors/{floor['id']}/units").json()
    assert data["plan_image"].endswith("plan_residential.png")
    areas = [u["area"] for u in data["units"]]
    assert areas == [75.7, 89.7, 82.6, 45.6, 45.6, 79.2, 89.0, 60.1]
    assert all(len(u["polygon"]) == 4 for u in data["units"])


def test_unit_detail(client: TestClient) -> None:
    unit = client.get("/api/units", params={"block": "Б", "floor": 3}).json()[0]
    detail = client.get(f"/api/units/{unit['id']}").json()
    assert detail["block_letter"] == "Б"
    assert detail["floor_number"] == 3
    assert round(sum(r["area"] for r in detail["rooms_detail"]), 1) == detail["area"]


def test_search_filters(client: TestClient) -> None:
    one_room = client.get("/api/units", params={"block": "А", "rooms": 1}).json()
    assert len(one_room) == 9 * 2
    big = client.get("/api/units", params={"min_area": 85, "max_area": 90}).json()
    assert big and all(85 <= u["area"] <= 90 for u in big)
    free = client.get("/api/units", params={"status": "free"}).json()
    assert len(free) == client.get("/api/stats").json()["free"]


def test_settings(client: TestClient) -> None:
    settings = client.get("/api/settings").json()
    assert settings["default_price_per_m2"] > 0
    assert 0 <= settings["down_payment_min_percent"] <= 100


def test_create_lead(client: TestClient) -> None:
    res = client.post(
        "/api/leads", json={"name": "Фаридун", "phone": "+992 93 123 45 67", "unit_id": 1}
    )
    assert res.status_code == 201
    assert res.json()["phone"] == "+992931234567"


def test_lead_rejects_foreign_phone(client: TestClient) -> None:
    res = client.post("/api/leads", json={"name": "Иван", "phone": "+7 999 123 45 67"})
    assert res.status_code == 422


def test_lead_rate_limit(client: TestClient) -> None:
    payload = {"name": "Тест", "phone": "+992931234567"}
    codes = [client.post("/api/leads", json=payload).status_code for _ in range(6)]
    assert codes[:5] == [201] * 5
    assert codes[5] == 429
