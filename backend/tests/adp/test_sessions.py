H = {"X-API-Key": "test-key-123"}


def _user(client):
    return client.post("/v1/users", json={"display_name": "Test"}, headers=H).json()["user_id"]


def test_create_session(client):
    uid = _user(client)
    res = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H)
    assert res.status_code == 201
    body = res.json()
    assert body["user_id"] == uid
    assert body["status"] == "active"
    assert body["closed_at"] is None


def test_create_session_for_missing_user_returns_404(client):
    res = client.post("/v1/users/missing/sessions", json={}, headers=H)
    assert res.status_code == 404


def test_list_sessions_filtered_by_status(client):
    uid = _user(client)
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    client.post(f"/v1/sessions/{sid}/close", headers=H)
    client.post(f"/v1/users/{uid}/sessions", json={}, headers=H)

    active = client.get(f"/v1/users/{uid}/sessions?status=active", headers=H).json()["items"]
    closed = client.get(f"/v1/users/{uid}/sessions?status=closed", headers=H).json()["items"]
    assert len(active) == 1
    assert len(closed) == 1


def test_get_session(client):
    uid = _user(client)
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    res = client.get(f"/v1/sessions/{sid}", headers=H)
    assert res.status_code == 200
    assert res.json()["session_id"] == sid


def test_update_session_metadata(client):
    uid = _user(client)
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    res = client.patch(f"/v1/sessions/{sid}", json={"metadata": {"channel": "web"}}, headers=H)
    assert res.status_code == 200
    assert res.json()["metadata"] == {"channel": "web"}


def test_close_session(client):
    uid = _user(client)
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    res = client.post(f"/v1/sessions/{sid}/close", headers=H)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "closed"
    assert body["closed_at"] is not None


def test_close_already_closed_returns_409(client):
    uid = _user(client)
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    client.post(f"/v1/sessions/{sid}/close", headers=H)
    res = client.post(f"/v1/sessions/{sid}/close", headers=H)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "conflict"
