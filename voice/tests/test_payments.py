import pytest
import respx
from httpx import Response


@pytest.fixture()
def active_call(client, api_key):
    line_resp = client.post("/v1/lines", json={"agent_id": "agent-1", "name": "Pay Line"}, headers={"X-API-Key": api_key})
    line = line_resp.json()
    adp_user_id = line["adp_user_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "sess-pay"})
        )
        call_resp = client.post(f"/v1/lines/{line['line_id']}/calls", headers={"X-Line-Key": line["line_key"]})
    return {"call_id": call_resp.json()["call_id"], "line": line}


def test_payment_allowed(client, api_key, active_call):
    call_id = active_call["call_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-trust/v1/guardrails/check").mock(return_value=Response(200, json={"allowed": True}))
        resp = client.post(
            f"/v1/calls/{call_id}/payment",
            json={"masked_card_last4": "4242", "amount": 99.99, "currency": "USD"},
            headers={"X-API-Key": api_key},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "collected"
    assert data["call_id"] == call_id


def test_payment_blocked(client, api_key, active_call):
    call_id = active_call["call_id"]
    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-trust/v1/guardrails/check").mock(return_value=Response(200, json={"allowed": False}))
        resp = client.post(
            f"/v1/calls/{call_id}/payment",
            json={"masked_card_last4": "0000", "amount": 500.0, "currency": "USD"},
            headers={"X-API-Key": api_key},
        )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "payment_blocked"


def test_payment_call_not_found(client, api_key):
    with respx.mock(assert_all_called=False):
        resp = client.post(
            "/v1/calls/nonexistent/payment",
            json={"masked_card_last4": "1234", "amount": 10.0, "currency": "USD"},
            headers={"X-API-Key": api_key},
        )
    assert resp.status_code == 404


def test_payment_requires_api_key(client, active_call):
    call_id = active_call["call_id"]
    resp = client.post(
        f"/v1/calls/{call_id}/payment",
        json={"masked_card_last4": "1234", "amount": 10.0, "currency": "USD"},
    )
    assert resp.status_code == 401
