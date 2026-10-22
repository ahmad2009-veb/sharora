from fastapi.testclient import TestClient


def test_stats_counts_every_unit(client: TestClient) -> None:
    stats = client.get("/api/stats").json()
    assert stats["total"] == 2 * (1 + 8 * 7)
    assert stats["free"] + stats["reserved"] + stats["sold"] == stats["total"]


def test_blocks_are_ordered_with_free_counts(client: TestClient) -> None:
    blocks = client.get("/api/blocks").json()
    assert [(b["letter"], b["name"]) for b in blocks] == [("1", "Блок 1"), ("2", "Блок 2")]
    assert all(0 <= b["free_count"] <= b["total_count"] == 57 for b in blocks)
    assert all(
        b["free_count"] + b["reserved_count"] + b["sold_count"] == b["total_count"] for b in blocks
    )


def test_block_floors(client: TestClient) -> None:
    floors = client.get("/api/blocks/1/floors").json()
    assert [f["label"] for f in floors[:2]] == ["Этаж 1", "Этаж 2"]
    assert [f["number"] for f in floors] == list(range(1, 10))
    assert floors[0]["kind"] == "commercial"


def test_every_block_has_a_shop_and_seven_apartments_per_floor(client: TestClient) -> None:
    for block in client.get("/api/blocks").json():
        floors = client.get(f"/api/blocks/{block['letter']}/floors").json()
        assert len(floors) == 9
        for floor in floors:
            units = client.get(f"/api/floors/{floor['id']}/units").json()["units"]
            if floor["number"] == 1:
                assert [(u["kind"], u["name"]) for u in units] == [("commercial", "Мағоза 1")]
            else:
                assert [u["kind"] for u in units] == ["apartment"] * 7


def test_unknown_block_returns_404(client: TestClient) -> None:
    assert client.get("/api/blocks/Я/floors").status_code == 404


def test_floor_units_have_areas_and_polygons(client: TestClient) -> None:
    floor = client.get("/api/blocks/1/floors").json()[1]
    data = client.get(f"/api/floors/{floor['id']}/units").json()
    assert "plan_typical.svg" in data["plan_image"]
    assert [u["name"] for u in data["units"]] == [f"Хонаи {n}" for n in range(1, 8)]
    assert [u["area"] for u in data["units"]] == [42.0, 56.0, 64.0, 75.0, 83.0, 94.0, 103.0]
    assert [u["rooms"] for u in data["units"]] == [1, 1, 2, 2, 3, 3, 4]
    assert all(len(u["polygon"]) == 4 for u in data["units"])


def test_unit_detail(client: TestClient) -> None:
    unit = client.get("/api/units", params={"block": "2", "floor": 3}).json()[0]
    detail = client.get(f"/api/units/{unit['id']}").json()
    assert detail["block_letter"] == "2"
    assert detail["floor_number"] == 3
    assert round(sum(r["area"] for r in detail["rooms_detail"]), 1) == detail["area"]


def test_search_filters(client: TestClient) -> None:
    one_room = client.get("/api/units", params={"block": "1", "rooms": 1}).json()
    assert len(one_room) == 2 * 8  # apartments 1 and 2 on floors 2–9
    big = client.get("/api/units", params={"min_area": 80, "max_area": 95}).json()
    assert big and all(80 <= u["area"] <= 95 for u in big)
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


def test_public_catalogue_is_briefly_cacheable(client: TestClient) -> None:
    for path in ("/api/stats", "/api/blocks", "/api/blocks/1/floors", "/api/settings"):
        res = client.get(path)
        assert res.status_code == 200
        assert res.headers["cache-control"] == "public, max-age=10, stale-while-revalidate=50"
        assert res.headers["vercel-cdn-cache-control"] == "no-store"


def test_admin_requests_to_the_catalogue_are_not_cached(admin_client: TestClient) -> None:
    assert admin_client.get("/api/stats").headers["cache-control"] == "private, no-store"


def test_lead_responses_are_not_cached(client: TestClient) -> None:
    res = client.post("/api/leads", json={"name": "Тест", "phone": "+992931234567"})
    assert res.status_code == 201
    assert "cache-control" not in res.headers
