H = {"X-API-Key": "test-key-123"}


def _setup(client):
    uid = client.post("/v1/users", json={"display_name": "Alice"}, headers=H).json()["user_id"]
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    client.post(f"/v1/sessions/{sid}/messages", json={"role": "user", "content": "hello"}, headers=H)
    client.post(f"/v1/sessions/{sid}/messages", json={"role": "assistant", "content": "hi there"}, headers=H)
    return uid, sid


def test_context_with_profile_and_history(client):
    uid, sid = _setup(client)
    res = client.post("/v1/context", json={"user_id": uid, "session_id": sid}, headers=H)
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["user_id"] == uid
    assert len(body["messages"]) == 2
    assert body["session_summary"]["total_sessions"] == 1
    assert body["token_estimate"] >= 0


def test_context_without_history(client):
    uid, sid = _setup(client)
    res = client.post(
        "/v1/context",
        json={"user_id": uid, "session_id": sid, "include_history": False},
        headers=H,
    )
    assert res.status_code == 200
    assert res.json()["messages"] == []


def test_context_token_budget_truncates_oldest(client):
    uid = client.post("/v1/users", json={"display_name": "B"}, headers=H).json()["user_id"]
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    # Add messages with lots of content so token budget kicks in
    for i in range(5):
        client.post(
            f"/v1/sessions/{sid}/messages",
            json={"role": "user", "content": "x" * 400},
            headers=H,
        )
    # Very tight budget — should truncate down to fewer messages
    res = client.post(
        "/v1/context",
        json={"user_id": uid, "session_id": sid, "max_tokens": 100},
        headers=H,
    )
    assert res.status_code == 200
    assert len(res.json()["messages"]) < 5


def test_context_for_user_with_no_sessions(client):
    uid = client.post("/v1/users", json={"display_name": "C"}, headers=H).json()["user_id"]
    res = client.post("/v1/context", json={"user_id": uid}, headers=H)
    assert res.status_code == 200
    body = res.json()
    assert body["messages"] == []
    assert body["session_summary"]["total_sessions"] == 0


def test_context_for_missing_user_returns_404(client):
    res = client.post("/v1/context", json={"user_id": "ghost"}, headers=H)
    assert res.status_code == 404
