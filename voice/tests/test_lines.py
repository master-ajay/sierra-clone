def test_create_line(client, api_key):
    resp = client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Test Line"}, headers={"X-API-Key": api_key})
    assert resp.status_code == 201
    data = resp.json()
    assert data["agent_id"] == "agent-1"
    assert data["name"] == "Test Line"
    assert data["status"] == "active"
    assert len(data["line_key"]) == 64
    assert data["line_id"]


def test_list_lines(client, api_key):
    client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Line A"}, headers={"X-API-Key": api_key})
    client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Line B"}, headers={"X-API-Key": api_key})
    resp = client.get("/v1/lines", headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2
    assert "next_cursor" in data


def test_list_lines_filter_by_agent(client, api_key):
    client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Line A"}, headers={"X-API-Key": api_key})
    client.post("/v1/lines", json={"agent_id": "agent-2", "name": "Line B"}, headers={"X-API-Key": api_key})
    resp = client.get("/v1/lines?agent_id=agent-1", headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["agent_id"] == "agent-1"


def test_get_line(client, api_key):
    create_resp = client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Test Line"}, headers={"X-API-Key": api_key})
    line_id = create_resp.json()["line_id"]
    resp = client.get(f"/v1/lines/{line_id}", headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    assert resp.json()["line_id"] == line_id


def test_get_line_not_found(client, api_key):
    resp = client.get("/v1/lines/nonexistent", headers={"X-API-Key": api_key})
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_update_line_name(client, api_key):
    create_resp = client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Old Name"}, headers={"X-API-Key": api_key})
    line_id = create_resp.json()["line_id"]
    resp = client.patch(f"/v1/lines/{line_id}", json={"name": "New Name"}, headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_update_line_status(client, api_key):
    create_resp = client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Test"}, headers={"X-API-Key": api_key})
    line_id = create_resp.json()["line_id"]
    resp = client.patch(f"/v1/lines/{line_id}", json={"status": "paused"}, headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    assert resp.json()["status"] == "paused"


def test_revoke_line(client, api_key):
    create_resp = client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Test"}, headers={"X-API-Key": api_key})
    line_id = create_resp.json()["line_id"]
    resp = client.delete(f"/v1/lines/{line_id}", headers={"X-API-Key": api_key})
    assert resp.status_code == 204
    # Revoked line returns 404 on get
    get_resp = client.get(f"/v1/lines/{line_id}", headers={"X-API-Key": api_key})
    assert get_resp.status_code == 404


def test_revoke_line_not_found(client, api_key):
    resp = client.delete("/v1/lines/nonexistent", headers={"X-API-Key": api_key})
    assert resp.status_code == 404


def test_line_key_is_64_hex(client, api_key):
    resp = client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Test"}, headers={"X-API-Key": api_key})
    line_key = resp.json()["line_key"]
    assert len(line_key) == 64
    assert all(c in "0123456789abcdef" for c in line_key)


def test_missing_api_key_rejected(client):
    resp = client.get("/v1/lines")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"
