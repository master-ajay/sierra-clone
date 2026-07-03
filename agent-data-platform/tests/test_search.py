H = {"X-API-Key": "test-key-123"}


def _setup(client):
    uid = client.post("/v1/users", json={"display_name": "Searcher"}, headers=H).json()["user_id"]
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    client.post(f"/v1/sessions/{sid}/messages", json={"role": "user", "content": "What is the shipping policy?"}, headers=H)
    client.post(f"/v1/sessions/{sid}/messages", json={"role": "assistant", "content": "We ship within 2 days."}, headers=H)
    client.post(f"/v1/sessions/{sid}/messages", json={"role": "user", "content": "What about returns?"}, headers=H)
    return uid, sid


def test_search_returns_matches(client):
    uid, _ = _setup(client)
    res = client.get(f"/v1/users/{uid}/search?q=shipping", headers=H)
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert "shipping" in items[0]["content"].lower()


def test_search_is_case_insensitive(client):
    uid, _ = _setup(client)
    items = client.get(f"/v1/users/{uid}/search?q=SHIPPING", headers=H).json()["items"]
    assert len(items) == 1


def test_search_no_results_returns_empty(client):
    uid, _ = _setup(client)
    items = client.get(f"/v1/users/{uid}/search?q=pizza", headers=H).json()["items"]
    assert items == []


def test_search_pagination(client):
    uid = client.post("/v1/users", json={"display_name": "P"}, headers=H).json()["user_id"]
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    for i in range(4):
        client.post(f"/v1/sessions/{sid}/messages", json={"role": "user", "content": f"match {i}"}, headers=H)
    res = client.get(f"/v1/users/{uid}/search?q=match&limit=2", headers=H)
    body = res.json()
    assert len(body["items"]) == 2
    assert body["next_cursor"] is not None


def test_stats_reflects_created_data(client):
    uid = client.post("/v1/users", json={"display_name": "Stats"}, headers=H).json()["user_id"]
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    client.post(f"/v1/sessions/{sid}/messages", json={"role": "user", "content": "hi"}, headers=H)
    client.post(f"/v1/sessions/{sid}/close", headers=H)

    stats = client.get("/v1/stats", headers=H).json()
    assert stats["users"] >= 1
    assert stats["sessions"]["closed"] >= 1
    assert stats["messages"] >= 1
