H = {"X-API-Key": "test-key-123"}


def test_health_returns_ok(client):
    res = client.get("/v1/health", headers=H)
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "database": "connected"}


def test_health_rejects_missing_key(client):
    res = client.get("/v1/health")
    assert res.status_code == 401
    assert res.json()["detail"]["error"]["code"] == "unauthorized"


def test_health_rejects_wrong_key(client):
    res = client.get("/v1/health", headers={"X-API-Key": "wrong"})
    assert res.status_code == 401


def test_stats_returns_zero_counts(client):
    res = client.get("/v1/stats", headers=H)
    assert res.status_code == 200
    body = res.json()
    assert body["channels"]["total"] == 0
    assert body["channels"]["active"] == 0
    assert body["messages"] == 0
