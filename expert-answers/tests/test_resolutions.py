import httpx
import respx

H = {"X-API-Key": "test-key-123"}
TRANSCRIPT = [{"role": "user", "content": "How do I return an item?"}, {"role": "assistant", "content": "You can return it within 30 days."}]
RUNTIME_RESPONSE = {"answer": '{"title": "Return Policy", "body": "Items can be returned within 30 days.", "cited_excerpt": "How do I return an item?"}'}


def test_resolution_requires_api_key(client):
    resp = client.post("/v1/resolutions", json={"conversation_id": "c1", "transcript": TRANSCRIPT, "resolution_note": "refund issued"})
    assert resp.status_code == 401


def test_resolution_requires_exactly_one_source(client):
    # Neither provided
    resp = client.post("/v1/resolutions", headers=H, json={"conversation_id": "c1", "resolution_note": "note"})
    assert resp.status_code == 422

    # Both provided
    resp = client.post("/v1/resolutions", headers=H, json={
        "conversation_id": "c1",
        "transcript": TRANSCRIPT,
        "adp_session_id": "s1",
        "resolution_note": "note",
    })
    assert resp.status_code == 422


@respx.mock
def test_resolution_with_transcript_creates_draft(client, settings):
    respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(200, json=RUNTIME_RESPONSE))

    resp = client.post("/v1/resolutions", headers=H, json={
        "conversation_id": "conv-1",
        "transcript": TRANSCRIPT,
        "resolution_note": "Refund was issued after verification.",
        "topic": "returns",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["resolution"]["status"] == "drafted"
    assert body["article"]["status"] == "pending_review"
    assert body["article"]["title"] == "Return Policy"
    assert body["article"]["topic"] == "returns"
    assert body["article"]["source_conversation_id"] == "conv-1"


@respx.mock
def test_resolution_with_adp_session_fetches_transcript(client, settings):
    session_id = "adp-sess-1"
    adp_messages = {"items": [{"role": "user", "content": "Q?"}, {"role": "assistant", "content": "A."}]}
    respx.get(f"{settings.expert_answers_adp_url}/v1/sessions/{session_id}/messages").mock(return_value=httpx.Response(200, json=adp_messages))
    respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(200, json=RUNTIME_RESPONSE))

    resp = client.post("/v1/resolutions", headers=H, json={
        "conversation_id": "conv-2",
        "adp_session_id": session_id,
        "resolution_note": "Issue resolved.",
    })
    assert resp.status_code == 201
    assert resp.json()["resolution"]["adp_session_id"] == session_id


@respx.mock
def test_resolution_draft_failure_marks_draft_failed(client, settings):
    respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(500))

    resp = client.post("/v1/resolutions", headers=H, json={
        "conversation_id": "conv-3",
        "transcript": TRANSCRIPT,
        "resolution_note": "Note",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["resolution"]["status"] == "draft_failed"
    assert body["article"] is None


@respx.mock
def test_retry_resolution(client, settings):
    # First: fail the draft
    respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(500))
    resp = client.post("/v1/resolutions", headers=H, json={"conversation_id": "c4", "transcript": TRANSCRIPT, "resolution_note": "note"})
    resolution_id = resp.json()["resolution"]["resolution_id"]

    # Now retry: succeed
    respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(200, json=RUNTIME_RESPONSE))
    resp = client.post(f"/v1/resolutions/{resolution_id}/retry", headers=H)
    assert resp.status_code == 200
    assert resp.json()["resolution"]["status"] == "drafted"
    assert resp.json()["article"] is not None


def test_retry_non_failed_resolution_returns_400(client, settings):
    # Create a successful resolution first
    with respx.mock:
        respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(200, json=RUNTIME_RESPONSE))
        resp = client.post("/v1/resolutions", headers=H, json={"conversation_id": "c5", "transcript": TRANSCRIPT, "resolution_note": "note"})
    resolution_id = resp.json()["resolution"]["resolution_id"]

    resp = client.post(f"/v1/resolutions/{resolution_id}/retry", headers=H)
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "invalid_state"
