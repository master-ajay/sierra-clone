

H = {"X-API-Key": "test-key-123"}


def test_create_user_without_external_id(client):
    res = client.post("/v1/users", json={"display_name": "Alice"}, headers=H)
    assert res.status_code == 201
    body = res.json()
    assert body["display_name"] == "Alice"
    assert body["external_id"] is None
    assert "user_id" in body


def test_create_user_with_external_id(client):
    res = client.post("/v1/users", json={"display_name": "Bob", "external_id": "ext-1"}, headers=H)
    assert res.status_code == 201
    assert res.json()["external_id"] == "ext-1"


def test_duplicate_external_id_returns_409(client):
    client.post("/v1/users", json={"display_name": "A", "external_id": "dup"}, headers=H)
    res = client.post("/v1/users", json={"display_name": "B", "external_id": "dup"}, headers=H)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "conflict"


def test_get_user_by_id(client):
    uid = client.post("/v1/users", json={"display_name": "Carol"}, headers=H).json()["user_id"]
    res = client.get(f"/v1/users/{uid}", headers=H)
    assert res.status_code == 200
    assert res.json()["user_id"] == uid


def test_get_missing_user_returns_404(client):
    res = client.get("/v1/users/does-not-exist", headers=H)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "not_found"


def test_get_user_by_external_id(client):
    client.post("/v1/users", json={"display_name": "Dave", "external_id": "ext-dave"}, headers=H)
    res = client.get("/v1/users/by-external-id/ext-dave", headers=H)
    assert res.status_code == 200
    assert res.json()["display_name"] == "Dave"


def test_list_users_pagination(client):
    for i in range(3):
        client.post("/v1/users", json={"display_name": f"User{i}"}, headers=H)
    res = client.get("/v1/users?limit=2", headers=H)
    assert res.status_code == 200
    body = res.json()
    assert len(body["items"]) == 2
    assert body["next_cursor"] is not None


def test_update_user_metadata(client):
    uid = client.post("/v1/users", json={"display_name": "Eve"}, headers=H).json()["user_id"]
    res = client.patch(f"/v1/users/{uid}", json={"metadata": {"tier": "gold"}}, headers=H)
    assert res.status_code == 200
    assert res.json()["metadata"] == {"tier": "gold"}


def test_delete_user(client):
    uid = client.post("/v1/users", json={"display_name": "Frank"}, headers=H).json()["user_id"]
    res = client.delete(f"/v1/users/{uid}", headers=H)
    assert res.status_code == 204
    assert client.get(f"/v1/users/{uid}", headers=H).status_code == 404


def test_delete_user_cascades_sessions(client):
    uid = client.post("/v1/users", json={"display_name": "Grace"}, headers=H).json()["user_id"]
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    client.delete(f"/v1/users/{uid}", headers=H)
    assert client.get(f"/v1/sessions/{sid}", headers=H).status_code == 404
