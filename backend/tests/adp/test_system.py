def test_health_returns_ok(client, api_key):
    res = client.get("/v1/health", headers={"X-API-Key": api_key})
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "database": "connected"}


def test_health_rejects_missing_api_key(client):
    res = client.get("/v1/health")
    assert res.status_code == 401
    body = res.json()
    assert body["detail"]["error"]["code"] == "unauthorized"


def test_health_rejects_wrong_api_key(client):
    res = client.get("/v1/health", headers={"X-API-Key": "wrong"})
    assert res.status_code == 401


def test_stats_returns_zero_counts(client, api_key):
    res = client.get("/v1/stats", headers={"X-API-Key": api_key})
    assert res.status_code == 200
    body = res.json()
    assert body["users"] == 0
    assert body["sessions"] == {"active": 0, "closed": 0}
    assert body["messages"] == 0
