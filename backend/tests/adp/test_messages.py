H = {"X-API-Key": "test-key-123"}


def _session(client):
    uid = client.post("/v1/users", json={"display_name": "T"}, headers=H).json()["user_id"]
    sid = client.post(f"/v1/users/{uid}/sessions", json={}, headers=H).json()["session_id"]
    return uid, sid


def test_append_single_message(client):
    _, sid = _session(client)
    res = client.post(
        f"/v1/sessions/{sid}/messages",
        json={"role": "user", "content": "Hello"},
        headers=H,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["role"] == "user"
    assert body["content"] == "Hello"
    assert body["session_id"] == sid


def test_batch_append(client):
    _, sid = _session(client)
    res = client.post(
        f"/v1/sessions/{sid}/messages/batch",
        json=[
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello!"},
        ],
        headers=H,
    )
    assert res.status_code == 201
    assert len(res.json()) == 2


def test_list_messages_chronological(client):
    _, sid = _session(client)
    client.post(f"/v1/sessions/{sid}/messages", json={"role": "user", "content": "first"}, headers=H)
    client.post(f"/v1/sessions/{sid}/messages", json={"role": "assistant", "content": "second"}, headers=H)
    items = client.get(f"/v1/sessions/{sid}/messages", headers=H).json()["items"]
    assert items[0]["content"] == "first"
    assert items[1]["content"] == "second"


def test_metadata_roundtrips(client):
    _, sid = _session(client)
    meta = {"citations": ["chunk-1"], "confidence_score": 0.9, "action": "answer"}
    res = client.post(
        f"/v1/sessions/{sid}/messages",
        json={"role": "assistant", "content": "OK", "metadata": meta},
        headers=H,
    )
    assert res.json()["metadata"] == meta


def test_append_to_closed_session_returns_409(client):
    _, sid = _session(client)
    client.post(f"/v1/sessions/{sid}/close", headers=H)
    res = client.post(
        f"/v1/sessions/{sid}/messages",
        json={"role": "user", "content": "late"},
        headers=H,
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "conflict"
