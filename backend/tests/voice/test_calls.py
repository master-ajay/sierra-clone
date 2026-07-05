import json

import pytest
import respx
from httpx import Response

_TRUST_ALLOWED = {"allowed": True, "message_clean": "Hi!", "flags": [], "audit_id": "audit-1"}


@pytest.fixture()
def line(client, api_key):
    resp = client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Test Line"}, headers={"X-API-Key": api_key})
    return resp.json()


@pytest.fixture()
def adp_session_mock():
    with respx.mock(base_url="http://mock-adp") as mock:
        mock.post("/v1/users/", name="create_session").mock(return_value=Response(200, json={"session_id": "sess-123"}))
        yield mock


def _mock_adp_and_runtime(line_key_val=None):
    return respx.mock(assert_all_called=False)


def test_start_call(client, api_key, line):
    line_key = line["line_key"]
    adp_user_id = line["adp_user_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "sess-123"})
        )
        resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": line_key})
    assert resp.status_code == 201
    data = resp.json()
    assert "call_id" in data
    assert data["session_id"] == "sess-123"


def test_start_call_invalid_line_key(client, api_key, line):
    with respx.mock(assert_all_called=False):
        resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": "wrong-key"})
    assert resp.status_code == 401


def test_start_call_paused_line(client, api_key, line):
    line_id = line["line_id"]
    line_key = line["line_key"]
    client.patch(f"/v1/lines/{line_id}", json={"status": "paused"}, headers={"X-API-Key": api_key})
    resp = client.post(f"/v1/lines/{line_id}/calls", headers={"X-Line-Key": line_key})
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "call_unavailable"


def test_exchange_turn(client, api_key, line):
    line_key = line["line_key"]
    adp_user_id = line["adp_user_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "sess-123"})
        )
        start_resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": line_key})
    call_id = start_resp.json()["call_id"]

    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-trust/v1/check").mock(return_value=Response(200, json=_TRUST_ALLOWED))
        mock.post("http://mock-adp/v1/context").mock(return_value=Response(200, json={"messages": []}))
        mock.post("http://mock-runtime/query").mock(
            side_effect=[
                Response(200, json={"answer": "Hello there!"}),
                Response(200, json={"answer": json.dumps({"label": "positive", "score": 0.8})}),
            ]
        )
        mock.post("http://mock-adp/v1/sessions/sess-123/messages/batch").mock(return_value=Response(200, json={}))
        resp = client.post(f"/v1/calls/{call_id}/turns", json={"text": "Hi!"}, headers={"X-Line-Key": line_key})

    assert resp.status_code == 200
    data = resp.json()
    assert data["reply"] == "Hello there!"
    assert data["sentiment"]["label"] == "positive"
    assert data["sentiment"]["score"] == 0.8
    assert data["call_sentiment_trend"] == [0.8]
    assert data["escalation_recommended"] is False


def test_escalation_recommended_after_3_negative_turns(client, api_key, line):
    line_key = line["line_key"]
    adp_user_id = line["adp_user_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "sess-neg"})
        )
        start_resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": line_key})
    call_id = start_resp.json()["call_id"]

    for i in range(3):
        with respx.mock(assert_all_called=False) as mock:
            mock.post("http://mock-trust/v1/check").mock(return_value=Response(200, json={**_TRUST_ALLOWED, "message_clean": "I'm very angry!"}))
            mock.post("http://mock-adp/v1/context").mock(return_value=Response(200, json={"messages": []}))
            mock.post("http://mock-runtime/query").mock(
                side_effect=[
                    Response(200, json={"answer": "I'm sorry to hear that."}),
                    Response(200, json={"answer": json.dumps({"label": "negative", "score": -0.8})}),
                ]
            )
            mock.post("http://mock-adp/v1/sessions/sess-neg/messages/batch").mock(return_value=Response(200, json={}))
            resp = client.post(f"/v1/calls/{call_id}/turns", json={"text": "I'm very angry!"}, headers={"X-Line-Key": line_key})
        assert resp.status_code == 200

    data = resp.json()
    assert data["escalation_recommended"] is True


def test_end_call(client, api_key, line):
    line_key = line["line_key"]
    adp_user_id = line["adp_user_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "sess-end"})
        )
        start_resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": line_key})
    call_id = start_resp.json()["call_id"]

    resp = client.post(f"/v1/calls/{call_id}/end", headers={"X-Line-Key": line_key})
    assert resp.status_code == 200
    data = resp.json()
    assert "average_sentiment" in data
    assert "trend" in data


def test_turns_on_ended_call_rejected(client, api_key, line):
    line_key = line["line_key"]
    adp_user_id = line["adp_user_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "sess-done"})
        )
        start_resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": line_key})
    call_id = start_resp.json()["call_id"]
    client.post(f"/v1/calls/{call_id}/end", headers={"X-Line-Key": line_key})

    resp = client.post(f"/v1/calls/{call_id}/turns", json={"text": "hello"}, headers={"X-Line-Key": line_key})
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "call_unavailable"


def test_escalate_call(client, api_key, line):
    line_key = line["line_key"]
    adp_user_id = line["adp_user_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "sess-esc"})
        )
        start_resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": line_key})
    call_id = start_resp.json()["call_id"]

    with respx.mock(assert_all_called=False) as mock:
        msgs = [{"role": "user", "content": "help"}]
        mock.post("http://mock-adp/v1/context").mock(return_value=Response(200, json={"messages": msgs}))
        mock.post("http://mock-runtime/query").mock(
            return_value=Response(200, json={"answer": "Call summary: customer needed help."})
        )
        resp = client.post(f"/v1/calls/{call_id}/escalate", headers={"X-API-Key": api_key})

    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"] == "Call summary: customer needed help."
    assert "turns" in data


def test_escalated_call_still_accepts_turns(client, api_key, line):
    line_key = line["line_key"]
    adp_user_id = line["adp_user_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "sess-esc2"})
        )
        start_resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": line_key})
    call_id = start_resp.json()["call_id"]

    # Escalate
    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-adp/v1/context").mock(return_value=Response(200, json={"messages": []}))
        mock.post("http://mock-runtime/query").mock(return_value=Response(200, json={"answer": "Summary here"}))
        client.post(f"/v1/calls/{call_id}/escalate", headers={"X-API-Key": api_key})

    # Exchange turn on escalated call
    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-trust/v1/check").mock(return_value=Response(200, json={**_TRUST_ALLOWED, "message_clean": "still there?"}))
        mock.post("http://mock-adp/v1/context").mock(return_value=Response(200, json={"messages": []}))
        mock.post("http://mock-runtime/query").mock(
            side_effect=[
                Response(200, json={"answer": "Still here!"}),
                Response(200, json={"answer": json.dumps({"label": "neutral", "score": 0.0})}),
            ]
        )
        mock.post("http://mock-adp/v1/sessions/sess-esc2/messages/batch").mock(return_value=Response(200, json={}))
        resp = client.post(f"/v1/calls/{call_id}/turns", json={"text": "still there?"}, headers={"X-Line-Key": line_key})

    assert resp.status_code == 200
