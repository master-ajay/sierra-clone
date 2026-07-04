"""Full lifecycle integration test for ADP."""

H = {"X-API-Key": "test-key-123"}


def test_full_lifecycle(client):
    # 1. Create user
    user = client.post("/v1/users", json={"display_name": "Integration", "external_id": "int-1"}, headers=H).json()
    uid = user["user_id"]
    assert user["display_name"] == "Integration"

    # 2. Retrieve by external ID
    found = client.get("/v1/users/by-external-id/int-1", headers=H).json()
    assert found["user_id"] == uid

    # 3. Open session
    session = client.post(f"/v1/users/{uid}/sessions", json={"metadata": {"source": "test"}}, headers=H).json()
    sid = session["session_id"]
    assert session["status"] == "active"

    # 4. Append messages (simulate a conversation turn)
    client.post(
        f"/v1/sessions/{sid}/messages/batch",
        json=[
            {"role": "user", "content": "How long does shipping take?"},
            {"role": "assistant", "content": "We ship within 2 business days.", "metadata": {"citations": ["shipping.md::0"]}},
        ],
        headers=H,
    )
    client.post(
        f"/v1/sessions/{sid}/messages",
        json={"role": "user", "content": "What is the return policy?"},
        headers=H,
    )

    # 5. List messages — should be chronological
    msgs = client.get(f"/v1/sessions/{sid}/messages", headers=H).json()["items"]
    assert len(msgs) == 3
    assert msgs[0]["role"] == "user"
    assert msgs[1]["metadata"]["citations"] == ["shipping.md::0"]

    # 6. Fetch context
    ctx = client.post("/v1/context", json={"user_id": uid, "session_id": sid}, headers=H).json()
    assert ctx["user"]["user_id"] == uid
    assert len(ctx["messages"]) == 3
    assert ctx["session_summary"]["total_sessions"] == 1
    assert ctx["token_estimate"] >= 0

    # 7. Search messages
    results = client.get(f"/v1/users/{uid}/search?q=shipping", headers=H).json()["items"]
    assert len(results) == 1  # only "How long does shipping take?" contains "shipping"

    # 8. Close session
    closed = client.post(f"/v1/sessions/{sid}/close", headers=H).json()
    assert closed["status"] == "closed"
    assert closed["closed_at"] is not None

    # 9. Cannot append to closed session
    res = client.post(f"/v1/sessions/{sid}/messages", json={"role": "user", "content": "late"}, headers=H)
    assert res.status_code == 409

    # 10. Stats reflect the data
    stats = client.get("/v1/stats", headers=H).json()
    assert stats["users"] >= 1
    assert stats["sessions"]["closed"] >= 1
    assert stats["messages"] >= 3

    # 11. Update user metadata
    updated = client.patch(f"/v1/users/{uid}", json={"metadata": {"plan": "pro"}}, headers=H).json()
    assert updated["metadata"]["plan"] == "pro"

    # 12. Delete user cascades sessions and messages
    client.delete(f"/v1/users/{uid}", headers=H)
    assert client.get(f"/v1/users/{uid}", headers=H).status_code == 404
    assert client.get(f"/v1/sessions/{sid}", headers=H).status_code == 404

    # 13. Search returns empty after cascade delete
    results_after = client.get(f"/v1/users/{uid}/search?q=shipping", headers=H).json()["items"]
    assert results_after == []
