import json

import httpx
import respx

H = {"X-API-Key": "test-key-123"}
TRANSCRIPT = [{"role": "user", "content": "What is the warranty?"}]
RUNTIME_RESPONSE = {"answer": '{"title": "Warranty Policy", "body": "12 months standard warranty.", "cited_excerpt": "What is the warranty?"}'}


def _make_article(client, settings, topic=None):
    with respx.mock:
        respx.post(f"{settings.expert_answers_trust_url}/v1/check").mock(
            side_effect=lambda req: httpx.Response(200, json={
                "allowed": True,
                "message_clean": json.loads(req.content).get("message", ""),
                "flags": [],
                "audit_id": "test-audit",
            })
        )
        respx.post(f"{settings.expert_answers_runtime_url}/query").mock(return_value=httpx.Response(200, json=RUNTIME_RESPONSE))
        resp = client.post("/v1/resolutions", headers=H, json={
            "conversation_id": "conv-art",
            "transcript": TRANSCRIPT,
            "resolution_note": "Standard warranty applies.",
            "topic": topic,
        })
    return resp.json()["article"]


def test_list_articles_empty(client, api_key):
    resp = client.get("/v1/articles", headers=H)
    assert resp.status_code == 200
    assert resp.json() == {"items": [], "next_cursor": None}


def test_list_articles_returns_created(client, settings):
    article = _make_article(client, settings)
    resp = client.get("/v1/articles", headers=H)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["article_id"] == article["article_id"]


def test_list_articles_filter_by_status(client, settings):
    _make_article(client, settings)
    resp = client.get("/v1/articles?status=pending_review", headers=H)
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1

    resp = client.get("/v1/articles?status=published", headers=H)
    assert len(resp.json()["items"]) == 0


def test_list_articles_filter_by_topic(client, settings):
    _make_article(client, settings, topic="warranty")
    _make_article(client, settings, topic="returns")
    resp = client.get("/v1/articles?topic=warranty", headers=H)
    assert len(resp.json()["items"]) == 1


def test_get_article(client, settings):
    article = _make_article(client, settings)
    resp = client.get(f"/v1/articles/{article['article_id']}", headers=H)
    assert resp.status_code == 200
    assert resp.json()["article_id"] == article["article_id"]


def test_get_article_not_found(client):
    resp = client.get("/v1/articles/nonexistent", headers=H)
    assert resp.status_code == 404


def test_patch_article_approve(client, settings):
    article = _make_article(client, settings)
    resp = client.patch(f"/v1/articles/{article['article_id']}", headers=H, json={"status": "approved"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


def test_patch_article_publish(client, settings):
    article = _make_article(client, settings)
    aid = article["article_id"]
    client.patch(f"/v1/articles/{aid}", headers=H, json={"status": "approved"})
    resp = client.patch(f"/v1/articles/{aid}", headers=H, json={"status": "published"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "published"
    assert resp.json()["published_at"] is not None


def test_patch_article_reject(client, settings):
    article = _make_article(client, settings)
    resp = client.patch(f"/v1/articles/{article['article_id']}", headers=H, json={"status": "rejected"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_invalid_transition(client, settings):
    article = _make_article(client, settings)
    # Can't go from pending_review → published directly
    resp = client.patch(f"/v1/articles/{article['article_id']}", headers=H, json={"status": "published"})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "invalid_transition"


def test_patch_article_edit_fields(client, settings):
    article = _make_article(client, settings)
    resp = client.patch(f"/v1/articles/{article['article_id']}", headers=H, json={"title": "Updated Title", "body": "Updated body."})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"
    assert resp.json()["body"] == "Updated body."


def test_published_articles_endpoint(client, settings):
    article = _make_article(client, settings)
    aid = article["article_id"]
    client.patch(f"/v1/articles/{aid}", headers=H, json={"status": "approved"})
    client.patch(f"/v1/articles/{aid}", headers=H, json={"status": "published"})

    resp = client.get("/v1/articles/published", headers=H)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["status"] == "published"
    assert items[0]["source_conversation_id"] == "conv-art"
