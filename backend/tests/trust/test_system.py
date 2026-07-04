def test_health_requires_api_key(client):
    resp = client.get("/v1/health")
    assert resp.status_code == 401
    # Flat {"error": {...}} envelope per DEVELOPMENT-PLAYBOOK Part 3 — every
    # product's errors share one shape; FastAPI's default HTTPException
    # handler would otherwise nest this under "detail" (see main.py's
    # explicit http_exception_handler override).
    assert resp.json()["error"]["code"] == "unauthorized"


def test_health_rejects_wrong_key(client):
    resp = client.get("/v1/health", headers={"X-API-Key": "wrong"})
    assert resp.status_code == 401


def test_health_ok(client, api_key):
    resp = client.get("/v1/health", headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "connected"}
