import httpx
import respx

H = {"X-API-Key": "test-key-123"}
ADP_BASE = "http://localhost:8100"
RT_BASE = "http://localhost:8001"
TRUST_BASE = "http://localhost:8500"

_TRUST_ALLOWED = {"allowed": True, "message_clean": "Hi", "flags": [], "audit_id": "audit-1"}


def _channel(client):
    return client.post("/v1/channels", json={"agent_id": "ag-1", "name": "C", "type": "api"}, headers=H).json()


@respx.mock
def test_stats_increment_on_chat(client):
    ch = _channel(client)
    cid, ckey, uid = ch["channel_id"], ch["channel_key"], ch["adp_user_id"]

    respx.post(f"{TRUST_BASE}/v1/check").mock(return_value=httpx.Response(200, json=_TRUST_ALLOWED))
    respx.post(f"{ADP_BASE}/v1/users/{uid}/sessions").mock(return_value=httpx.Response(201, json={"session_id": "s1"}))
    respx.post(f"{ADP_BASE}/v1/context").mock(return_value=httpx.Response(200, json={"messages": [], "user": None, "session_summary": {}, "token_estimate": 0}))
    respx.post(f"{RT_BASE}/query").mock(return_value=httpx.Response(200, json={"answer": "Hi", "citations": [], "trace": {}}))
    respx.post(f"{ADP_BASE}/v1/sessions/s1/messages/batch").mock(return_value=httpx.Response(201, json=[]))

    client.post(f"/v1/channels/{cid}/chat", json={"message": "Hi"}, headers={"X-Channel-Key": ckey})

    stats = client.get(f"/v1/channels/{cid}/stats", headers=H).json()
    assert stats["total_messages"] == 1
    assert stats["total_sessions"] == 1
    assert stats["last_active_at"] is not None


@respx.mock
def test_stats_second_message_same_session(client):
    ch = _channel(client)
    cid, ckey, uid = ch["channel_id"], ch["channel_key"], ch["adp_user_id"]

    respx.post(f"{TRUST_BASE}/v1/check").mock(return_value=httpx.Response(200, json=_TRUST_ALLOWED))
    respx.post(f"{ADP_BASE}/v1/users/{uid}/sessions").mock(return_value=httpx.Response(201, json={"session_id": "s1"}))
    respx.post(f"{ADP_BASE}/v1/context").mock(return_value=httpx.Response(200, json={"messages": [], "user": None, "session_summary": {}, "token_estimate": 0}))
    respx.post(f"{RT_BASE}/query").mock(return_value=httpx.Response(200, json={"answer": "Hi", "citations": [], "trace": {}}))
    respx.post(f"{ADP_BASE}/v1/sessions/s1/messages/batch").mock(return_value=httpx.Response(201, json=[]))

    client.post(f"/v1/channels/{cid}/chat", json={"message": "msg1"}, headers={"X-Channel-Key": ckey})
    client.post(f"/v1/channels/{cid}/chat", json={"message": "msg2", "session_id": "s1"}, headers={"X-Channel-Key": ckey})

    stats = client.get(f"/v1/channels/{cid}/stats", headers=H).json()
    assert stats["total_messages"] == 2
    assert stats["total_sessions"] == 1  # second message reused session, no new session


def test_system_stats_aggregate(client):
    _channel(client)
    _channel(client)
    body = client.get("/v1/stats", headers=H).json()
    assert body["channels"]["total"] == 2
    assert body["channels"]["active"] == 2
