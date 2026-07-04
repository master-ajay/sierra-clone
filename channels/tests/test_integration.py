import httpx
import respx

H = {"X-API-Key": "test-key-123"}
ADP_BASE = "http://localhost:8100"
RT_BASE = "http://localhost:8001"
TRUST_BASE = "http://localhost:8500"

_TRUST_ALLOWED = {"allowed": True, "message_clean": "How long does shipping take?", "flags": [], "audit_id": "audit-1"}


@respx.mock
def test_full_lifecycle(client):
    # 1. Create channel
    ch = client.post("/v1/channels", json={"agent_id": "ag-1", "name": "Support", "type": "api"}, headers=H).json()
    cid, ckey, uid = ch["channel_id"], ch["channel_key"], ch["adp_user_id"]
    assert ch["status"] == "active"
    assert len(ckey) == 64

    # 2. Mock upstreams
    respx.post(f"{TRUST_BASE}/v1/check").mock(return_value=httpx.Response(200, json=_TRUST_ALLOWED))
    respx.post(f"{ADP_BASE}/v1/users/{uid}/sessions").mock(return_value=httpx.Response(201, json={"session_id": "sid-1"}))
    respx.post(f"{ADP_BASE}/v1/context").mock(return_value=httpx.Response(200, json={"messages": [], "user": None, "session_summary": {}, "token_estimate": 0}))
    respx.post(f"{RT_BASE}/query").mock(return_value=httpx.Response(200, json={"answer": "We ship in 2 days.", "citations": ["shipping.md::0"], "trace": {"confidence_score": 0.92}}))
    respx.post(f"{ADP_BASE}/v1/sessions/sid-1/messages/batch").mock(return_value=httpx.Response(201, json=[]))

    # 3. Send a message
    res = client.post(f"/v1/channels/{cid}/chat", json={"message": "How long does shipping take?"}, headers={"X-Channel-Key": ckey})
    assert res.status_code == 200
    body = res.json()
    assert body["reply"] == "We ship in 2 days."
    assert body["session_id"] == "sid-1"
    assert body["citations"] == ["shipping.md::0"]

    # 4. Stats reflect the message
    stats = client.get(f"/v1/channels/{cid}/stats", headers=H).json()
    assert stats["total_messages"] == 1
    assert stats["total_sessions"] == 1

    # 5. Pause channel → 503
    client.patch(f"/v1/channels/{cid}", json={"status": "paused"}, headers=H)
    res = client.post(f"/v1/channels/{cid}/chat", json={"message": "hello"}, headers={"X-Channel-Key": ckey})
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "channel_unavailable"

    # 6. Re-activate → messages work again
    client.patch(f"/v1/channels/{cid}", json={"status": "active"}, headers=H)
    respx.post(f"{TRUST_BASE}/v1/check").mock(return_value=httpx.Response(200, json={**_TRUST_ALLOWED, "message_clean": "follow up"}))
    respx.post(f"{ADP_BASE}/v1/context").mock(return_value=httpx.Response(200, json={"messages": [], "user": None, "session_summary": {}, "token_estimate": 0}))
    respx.post(f"{RT_BASE}/query").mock(return_value=httpx.Response(200, json={"answer": "Sure!", "citations": [], "trace": {}}))
    respx.post(f"{ADP_BASE}/v1/sessions/sid-1/messages/batch").mock(return_value=httpx.Response(201, json=[]))
    res = client.post(f"/v1/channels/{cid}/chat", json={"message": "follow up", "session_id": "sid-1"}, headers={"X-Channel-Key": ckey})
    assert res.status_code == 200

    # 7. Delete channel → 404
    client.delete(f"/v1/channels/{cid}", headers=H)
    assert client.get(f"/v1/channels/{cid}", headers=H).status_code == 404

    # 8. Channel key no longer works
    res = client.post(f"/v1/channels/{cid}/chat", json={"message": "hi"}, headers={"X-Channel-Key": ckey})
    assert res.status_code == 401

    # 9. System stats reflect zero after delete
    sys_stats = client.get("/v1/stats", headers=H).json()
    assert sys_stats["channels"]["total"] == 0
