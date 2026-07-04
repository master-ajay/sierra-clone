"""Full lifecycle integration test for the Voice product."""
import json

import respx
from httpx import Response


def test_full_call_lifecycle(client, api_key):
    # 1. Create line
    line_resp = client.post(
        "/v1/lines", json={"agent_id": "agent-integ", "name": "Integration Line"}, headers={"X-API-Key": api_key}
    )
    assert line_resp.status_code == 201
    line = line_resp.json()
    line_id = line["line_id"]
    line_key = line["line_key"]
    adp_user_id = line["adp_user_id"]

    # 2. Start call (mock ADP session creation)
    with respx.mock(assert_all_called=False) as mock:
        mock.post(f"http://mock-adp/v1/users/{adp_user_id}/sessions").mock(
            return_value=Response(200, json={"session_id": "integ-sess"})
        )
        call_resp = client.post(f"/v1/lines/{line_id}/calls", headers={"X-Line-Key": line_key})
    assert call_resp.status_code == 201
    call_id = call_resp.json()["call_id"]

    # 3. Exchange 3 positive turns → escalation_recommended=False
    for i in range(3):
        with respx.mock(assert_all_called=False) as mock:
            mock.post("http://mock-adp/v1/context").mock(return_value=Response(200, json={"messages": []}))
            mock.post("http://mock-runtime/query").mock(
                side_effect=[
                    Response(200, json={"answer": "Great to hear!"}),
                    Response(200, json={"answer": json.dumps({"label": "positive", "score": 0.8})}),
                ]
            )
            mock.post("http://mock-adp/v1/sessions/integ-sess/messages/batch").mock(return_value=Response(200, json={}))
            turn_resp = client.post(f"/v1/calls/{call_id}/turns", json={"text": "I love this!"}, headers={"X-Line-Key": line_key})
        assert turn_resp.status_code == 200

    data = turn_resp.json()
    assert data["escalation_recommended"] is False

    # 4. Exchange 3 negative turns → escalation_recommended=True
    for i in range(3):
        with respx.mock(assert_all_called=False) as mock:
            mock.post("http://mock-adp/v1/context").mock(return_value=Response(200, json={"messages": []}))
            mock.post("http://mock-runtime/query").mock(
                side_effect=[
                    Response(200, json={"answer": "I'm sorry to hear that."}),
                    Response(200, json={"answer": json.dumps({"label": "negative", "score": -0.8})}),
                ]
            )
            mock.post("http://mock-adp/v1/sessions/integ-sess/messages/batch").mock(return_value=Response(200, json={}))
            turn_resp = client.post(
                f"/v1/calls/{call_id}/turns", json={"text": "This is terrible!"}, headers={"X-Line-Key": line_key}
            )
        assert turn_resp.status_code == 200

    data = turn_resp.json()
    assert data["escalation_recommended"] is True

    # 5. Escalate → summary returned, status=escalated
    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-adp/v1/context").mock(
            return_value=Response(200, json={"messages": [{"role": "user", "content": "This is terrible!"}]})
        )
        mock.post("http://mock-runtime/query").mock(
            return_value=Response(200, json={"answer": "Customer was upset. Needs refund."})
        )
        escalate_resp = client.post(f"/v1/calls/{call_id}/escalate", headers={"X-API-Key": api_key})
    assert escalate_resp.status_code == 200
    esc_data = escalate_resp.json()
    assert esc_data["summary"] == "Customer was upset. Needs refund."
    assert isinstance(esc_data["turns"], list)

    # 6. Attempt payment → collected (guardrail mock allows it)
    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-trust/v1/check").mock(return_value=Response(200, json={"allowed": True}))
        pay_resp = client.post(
            f"/v1/calls/{call_id}/payment",
            json={"masked_card_last4": "4242", "amount": 49.99, "currency": "USD"},
            headers={"X-API-Key": api_key},
        )
    assert pay_resp.status_code == 200
    assert pay_resp.json()["status"] == "collected"

    # 7. Exchange one more turn (escalated call still accepts turns)
    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://mock-adp/v1/context").mock(return_value=Response(200, json={"messages": []}))
        mock.post("http://mock-runtime/query").mock(
            side_effect=[
                Response(200, json={"answer": "How can I help further?"}),
                Response(200, json={"answer": json.dumps({"label": "neutral", "score": 0.0})}),
            ]
        )
        mock.post("http://mock-adp/v1/sessions/integ-sess/messages/batch").mock(return_value=Response(200, json={}))
        after_esc_resp = client.post(
            f"/v1/calls/{call_id}/turns", json={"text": "still there?"}, headers={"X-Line-Key": line_key}
        )
    assert after_esc_resp.status_code == 200

    # 8. End call → status=completed, final sentiment summary returned
    end_resp = client.post(f"/v1/calls/{call_id}/end", headers={"X-Line-Key": line_key})
    assert end_resp.status_code == 200
    end_data = end_resp.json()
    assert "average_sentiment" in end_data
    assert "trend" in end_data
