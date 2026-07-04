import sqlite3

import httpx

from expert_answers.config import Settings
from expert_answers.models.article import ArticleResponse
from expert_answers.services.article_service import create_article
from expert_answers.services.resolution_service import get_prior_resolutions


def _build_prompt(transcript: list[dict], resolution_note: str, prior_resolutions: list[dict]) -> str:
    turns = "\n".join(f"{t['role'].upper()}: {t['content']}" for t in transcript)
    prior = ""
    if prior_resolutions:
        prior_texts = []
        for p in prior_resolutions:
            prior_note = p["resolution_note"]
            prior_texts.append(f"- {prior_note}")
        prior = "\nRelated prior resolutions:\n" + "\n".join(prior_texts)

    return (
        f"You are a knowledge-base article writer. Given the following resolved support conversation "
        f"and resolution note, write a concise knowledge article with a title and body that would help "
        f"future agents resolve similar questions. Ground the article in the conversation.{prior}\n\n"
        f"Conversation:\n{turns}\n\n"
        f"Resolution note: {resolution_note}\n\n"
        f"Respond in JSON: {{\"title\": \"...\", \"body\": \"...\", \"cited_excerpt\": \"...\"}}"
    )


def generate_draft(conn: sqlite3.Connection, resolution_id: str, transcript: list[dict], resolution_note: str, topic: str | None, settings: Settings) -> ArticleResponse:
    prior = get_prior_resolutions(conn, topic, limit=3) if topic else []
    prompt = _build_prompt(transcript, resolution_note, prior)

    resp = httpx.post(
        f"{settings.expert_answers_runtime_url}/query",
        json={"question": prompt, "context_messages": []},
        headers={"X-API-Key": settings.expert_answers_runtime_api_key},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    # Agent Runtime returns {"answer": "...", ...}; answer may be JSON or plain text
    answer = data.get("answer", "")
    import json as _json
    try:
        parsed = _json.loads(answer)
        title = parsed.get("title", "Untitled")
        body = parsed.get("body", answer)
        cited_excerpt = parsed.get("cited_excerpt", transcript[0]["content"] if transcript else "")
    except Exception:
        title = answer[:80] if answer else "Untitled"
        body = answer
        cited_excerpt = transcript[0]["content"] if transcript else ""

    return create_article(conn, resolution_id, title, body, cited_excerpt, topic)
