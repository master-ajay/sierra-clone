H = {"X-API-Key": "test-key-123"}


def _create(client, name="Test Channel", type="api", agent_id="agent-1"):
    return client.post("/v1/channels", json={"agent_id": agent_id, "name": name, "type": type}, headers=H)


def test_create_channel(client):
    res = _create(client)
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Test Channel"
    assert body["type"] == "api"
    assert body["status"] == "active"
    assert len(body["channel_key"]) == 64
    assert body["adp_user_id"] is not None


def test_channel_key_is_unique(client):
    k1 = _create(client, name="A").json()["channel_key"]
    k2 = _create(client, name="B").json()["channel_key"]
    assert k1 != k2


def test_get_channel(client):
    cid = _create(client).json()["channel_id"]
    res = client.get(f"/v1/channels/{cid}", headers=H)
    assert res.status_code == 200
    assert res.json()["channel_id"] == cid


def test_get_missing_channel_returns_404(client):
    res = client.get("/v1/channels/ghost", headers=H)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "not_found"


def test_list_channels(client):
    _create(client, name="A", agent_id="ag-1")
    _create(client, name="B", agent_id="ag-1")
    _create(client, name="C", agent_id="ag-2")
    items = client.get("/v1/channels", headers=H).json()["items"]
    assert len(items) == 3


def test_list_channels_filtered_by_agent(client):
    _create(client, name="A", agent_id="ag-1")
    _create(client, name="B", agent_id="ag-2")
    items = client.get("/v1/channels?agent_id=ag-1", headers=H).json()["items"]
    assert len(items) == 1
    assert items[0]["agent_id"] == "ag-1"


def test_list_channels_filtered_by_status(client):
    cid = _create(client, name="A").json()["channel_id"]
    _create(client, name="B")
    client.patch(f"/v1/channels/{cid}", json={"status": "paused"}, headers=H)
    active = client.get("/v1/channels?status=active", headers=H).json()["items"]
    paused = client.get("/v1/channels?status=paused", headers=H).json()["items"]
    assert len(active) == 1
    assert len(paused) == 1


def test_update_channel_name(client):
    cid = _create(client).json()["channel_id"]
    res = client.patch(f"/v1/channels/{cid}", json={"name": "Renamed"}, headers=H)
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed"


def test_update_channel_status_to_paused(client):
    cid = _create(client).json()["channel_id"]
    res = client.patch(f"/v1/channels/{cid}", json={"status": "paused"}, headers=H)
    assert res.json()["status"] == "paused"


def test_delete_channel(client):
    cid = _create(client).json()["channel_id"]
    res = client.delete(f"/v1/channels/{cid}", headers=H)
    assert res.status_code == 204
    assert client.get(f"/v1/channels/{cid}", headers=H).status_code == 404


def test_delete_missing_channel_returns_404(client):
    res = client.delete("/v1/channels/ghost", headers=H)
    assert res.status_code == 404


def test_get_stats_empty(client):
    cid = _create(client).json()["channel_id"]
    res = client.get(f"/v1/channels/{cid}/stats", headers=H)
    assert res.status_code == 200
    body = res.json()
    assert body["total_messages"] == 0
    assert body["total_sessions"] == 0
    assert body["last_active_at"] is None


def test_get_snippet_widget(client):
    cid = client.post("/v1/channels", json={"agent_id": "a", "name": "W", "type": "widget"}, headers=H).json()["channel_id"]
    res = client.get(f"/v1/channels/{cid}/snippet", headers=H)
    assert res.status_code == 200
    body = res.json()
    assert "widget.js" in body["snippet"]
    assert "data-channel-key" in body["snippet"]


def test_get_snippet_api(client):
    cid = _create(client, type="api").json()["channel_id"]
    body = client.get(f"/v1/channels/{cid}/snippet", headers=H).json()
    assert "curl" in body["snippet"]
    assert "X-Channel-Key" in body["snippet"]
