"""Full lifecycle: submit resolution → draft created → approve → publish → appears in /published."""
import httpx
import respx

H = {"X-API-Key": "test-key-123"}
TRANSCRIPT = [
    {"role": "user", "content": "My order hasn't arrived after 2 weeks."},
    {"role": "assistant", "content": "I'll check your order status right away."},
    {"role": "user", "content": "Order #12345."},
    {"role": "assistant", "content": "Your order was delayed; we'll expedite shipping and issue a $10 credit."},
]
_ANSWER = '{"title": "Delayed Order Resolution", "body": "Expedite shipping and issue a credit.", "cited_excerpt": "My order hasn\'t arrived after 2 weeks."}'
RUNTIME_RESPONSE = {"answer": _ANSWER}


@respx.mock
def test_full_lifecycle(client, settings):
    respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(200, json=RUNTIME_RESPONSE))

    # 1. Submit resolution
    resp = client.post("/v1/resolutions", headers=H, json={
        "conversation_id": "conv-int-1",
        "transcript": TRANSCRIPT,
        "resolution_note": "Expedited shipping + $10 credit issued.",
        "topic": "shipping",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["resolution"]["status"] == "drafted"
    article_id = body["article"]["article_id"]
    assert body["article"]["status"] == "pending_review"
    assert body["article"]["source_conversation_id"] == "conv-int-1"

    # 2. Article appears in list with filter
    resp = client.get("/v1/articles?status=pending_review&topic=shipping", headers=H)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert any(a["article_id"] == article_id for a in items)

    # 3. Get article detail
    resp = client.get(f"/v1/articles/{article_id}", headers=H)
    assert resp.status_code == 200
    assert resp.json()["cited_excerpt"] != ""

    # 4. Approve
    resp = client.patch(f"/v1/articles/{article_id}", headers=H, json={"status": "approved"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"

    # 5. Publish
    resp = client.patch(f"/v1/articles/{article_id}", headers=H, json={"status": "published"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "published"
    assert resp.json()["published_at"] is not None

    # 6. Appears in /published
    resp = client.get("/v1/articles/published", headers=H)
    assert resp.status_code == 200
    published = resp.json()["items"]
    assert any(a["article_id"] == article_id for a in published)
    # published article is traceable to its source conversation
    article = next(a for a in published if a["article_id"] == article_id)
    assert article["source_conversation_id"] == "conv-int-1"

    # 7. Rejected article is retained (not deleted)
    respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(200, json=RUNTIME_RESPONSE))
    resp2 = client.post("/v1/resolutions", headers=H, json={
        "conversation_id": "conv-int-2",
        "transcript": TRANSCRIPT,
        "resolution_note": "Rejected resolution.",
    })
    reject_id = resp2.json()["article"]["article_id"]
    resp = client.patch(f"/v1/articles/{reject_id}", headers=H, json={"status": "rejected"})
    assert resp.status_code == 200
    # Still retrievable
    resp = client.get(f"/v1/articles/{reject_id}", headers=H)
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"

    # 8. Health check
    resp = client.get("/v1/health", headers=H)
    assert resp.json() == {"status": "ok", "database": "connected"}
