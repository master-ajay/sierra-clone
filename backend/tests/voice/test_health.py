def test_health_ok(client, api_key):
    resp = client.get("/v1/health", headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_health_missing_key(client):
    resp = client.get("/v1/health")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


def test_health_wrong_key(client):
    resp = client.get("/v1/health", headers={"X-API-Key": "wrong"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"
