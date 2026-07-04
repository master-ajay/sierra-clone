import json
import logging
import sqlite3

import httpx

from expert_answers.config import Settings
from expert_answers.models.article import ArticleResponse
from expert_answers.services.article_service import create_article
from expert_answers.services.resolution_service import get_prior_resolutions

logger = logging.getLogger(__name__)


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


def _sanitize_transcript(transcript: list[dict], resolution_id: str, settings: Settings) -> list[dict]:
    """Redact PII from each turn using Trust & Reliability before storing or sending to Agent Runtime."""
    sanitized = []
    for turn in transcript:
        content = turn.get("content", "")
        try:
            trust_resp = httpx.post(
                f"{settings.expert_answers_trust_url}/v1/check",
                json={"message": content, "channel_id": resolution_id, "direction": "inbound"},
                headers={"X-API-Key": settings.expert_answers_trust_api_key},
            )
            trust_resp.raise_for_status()
            trust_data = trust_resp.json()
            clean_content = trust_data.get("message_clean", content)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.warning("trust_sanitize_failed: resolution_id=%s error=%s — using raw content", resolution_id, exc)
            clean_content = content
        sanitized.append({**turn, "content": clean_content})
    return sanitized


def generate_draft(conn: sqlite3.Connection, resolution_id: str, transcript: list[dict], resolution_note: str, topic: str | None, settings: Settings) -> ArticleResponse:
    prior = get_prior_resolutions(conn, topic, limit=3) if topic else []
    # Sanitize transcript PII before building prompt or storing
    safe_transcript = _sanitize_transcript(transcript, resolution_id, settings)
    prompt = _build_prompt(safe_transcript, resolution_note, prior)

    try:
        resp = httpx.post(
            f"{settings.expert_answers_runtime_url}/query",
            json={"question": prompt, "context_messages": [], "mode": "generate"},
            headers={"X-API-Key": settings.expert_answers_runtime_api_key},
            timeout=30,
        )
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("agent_runtime_query_failed: resolution_id=%s status=%d", resolution_id, exc.response.status_code)
        raise
    except httpx.RequestError as exc:
        logger.error("agent_runtime_unreachable: resolution_id=%s error=%s", resolution_id, exc)
        raise
    data = resp.json()

    # Agent Runtime returns {"answer": "...", ...}; answer may be JSON, plain text, or None (escalate action)
    answer = data.get("answer") or ""
    try:
        parsed = json.loads(answer)
        title = parsed.get("title", "Untitled")
        body = parsed.get("body", answer)
        cited_excerpt = parsed.get("cited_excerpt", safe_transcript[0]["content"] if safe_transcript else "")
    except (json.JSONDecodeError, ValueError):
        logger.warning("draft_parse_fallback: runtime answer is not JSON, using raw text; resolution_id=%s", resolution_id)
        title = answer[:80] if answer else "Untitled"
        body = answer
        cited_excerpt = safe_transcript[0]["content"] if safe_transcript else ""

    return create_article(conn, resolution_id, title, body, cited_excerpt, topic)
