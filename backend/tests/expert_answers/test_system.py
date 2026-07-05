def test_health_requires_api_key(client):
    resp = client.get("/v1/health")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


def test_health_rejects_wrong_key(client):
    resp = client.get("/v1/health", headers={"X-API-Key": "wrong"})
    assert resp.status_code == 401


def test_health_ok(client, api_key):
    resp = client.get("/v1/health", headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "connected"}
