import logging
import sqlite3
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException

from channels.config import Settings
from channels.models.channel import ChannelResponse
from channels.models.chat import ChatResponse

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def send_message(
    conn: sqlite3.Connection, channel: ChannelResponse, message: str, session_id: str | None, settings: Settings
) -> ChatResponse:
    # 1. Trust & Reliability — check inbound message before doing any work
    try:
        trust_resp = httpx.post(
            f"{settings.channels_trust_url}/v1/check",
            json={"message": message, "channel_id": channel.channel_id, "direction": "inbound"},
            headers={"X-API-Key": settings.channels_trust_api_key},
        )
        trust_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("trust_check_failed: channel_id=%s status=%d", channel.channel_id, exc.response.status_code)
        raise
    except httpx.RequestError as exc:
        logger.error("trust_unreachable: channel_id=%s error=%s", channel.channel_id, exc)
        raise
    trust_result = trust_resp.json()
    if not trust_result.get("allowed", True):
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "message_blocked",
                    "message": "Message blocked by Trust & Reliability guardrails",
                    "details": {"flags": trust_result.get("flags", [])},
                }
            },
        )
    # Use the sanitized message (PII redacted) for all downstream calls
    message_clean = trust_result.get("message_clean", message)

    adp_headers = {"X-API-Key": settings.channels_adp_api_key}

    # 2. Open session if not provided
    if not session_id:
        try:
            resp = httpx.post(
                f"{settings.channels_adp_url}/v1/users/{channel.adp_user_id}/sessions",
                json={},
                headers=adp_headers,
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("adp_session_open_failed: channel_id=%s status=%d", channel.channel_id, exc.response.status_code)
            raise
        except httpx.RequestError as exc:
            logger.error("adp_unreachable: channel_id=%s error=%s", channel.channel_id, exc)
            raise
        session_id = resp.json()["session_id"]
        _increment_sessions(conn, channel.channel_id)

    # 3. Fetch context from ADP
    try:
        ctx_resp = httpx.post(
            f"{settings.channels_adp_url}/v1/context",
            json={"user_id": channel.adp_user_id, "session_id": session_id},
            headers=adp_headers,
        )
        ctx_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("adp_context_fetch_failed: channel_id=%s status=%d", channel.channel_id, exc.response.status_code)
        raise
    except httpx.RequestError as exc:
        logger.error("adp_unreachable: channel_id=%s error=%s", channel.channel_id, exc)
        raise
    context = ctx_resp.json()

    # 4. Build history for Agent Runtime
    history = [{"role": m["role"], "content": m["content"]} for m in context.get("messages", [])]

    # 5. Call Agent Runtime with sanitized message
    try:
        rt_resp = httpx.post(
            f"{settings.channels_runtime_url}/query",
            json={"question": message_clean, "history": history},
        )
        rt_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("agent_runtime_query_failed: channel_id=%s status=%d", channel.channel_id, exc.response.status_code)
        raise
    except httpx.RequestError as exc:
        logger.error("agent_runtime_unreachable: channel_id=%s error=%s", channel.channel_id, exc)
        raise
    result = rt_resp.json()
    reply = result.get("answer", "")
    citations = result.get("citations", [])
    trace = result.get("trace", {})

    # 6. Persist both turns to ADP (sanitized message stored, not raw)
    try:
        httpx.post(
            f"{settings.channels_adp_url}/v1/sessions/{session_id}/messages/batch",
            json=[
                {"role": "user", "content": message_clean},
                {"role": "assistant", "content": reply, "metadata": {"citations": citations, "trace": trace}},
            ],
            headers=adp_headers,
        ).raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("adp_batch_persist_failed: channel_id=%s status=%d", channel.channel_id, exc.response.status_code)
        raise
    except httpx.RequestError as exc:
        logger.error("adp_unreachable: channel_id=%s error=%s", channel.channel_id, exc)
        raise

    # 6. Update channel stats
    _increment_messages(conn, channel.channel_id)

    return ChatResponse(reply=reply, session_id=session_id, citations=citations, trace=trace)


def _increment_messages(conn: sqlite3.Connection, channel_id: str) -> None:
    now = _now()
    conn.execute(
        "UPDATE channels_channel_stats SET total_messages=total_messages+1, last_active_at=? WHERE channel_id=?",
        (now, channel_id),
    )
    conn.commit()


def _increment_sessions(conn: sqlite3.Connection, channel_id: str) -> None:
    conn.execute(
        "UPDATE channels_channel_stats SET total_sessions=total_sessions+1 WHERE channel_id=?",
        (channel_id,),
    )
    conn.commit()
