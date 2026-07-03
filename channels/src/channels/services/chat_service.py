import sqlite3
from datetime import datetime, timezone

import httpx

from channels.config import Settings
from channels.models.channel import ChannelResponse
from channels.models.chat import ChatResponse


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def send_message(conn: sqlite3.Connection, channel: ChannelResponse, message: str, session_id: str | None, settings: Settings) -> ChatResponse:
    adp_headers = {"X-API-Key": settings.channels_adp_api_key}

    # 1. Open session if not provided
    if not session_id:
        resp = httpx.post(
            f"{settings.channels_adp_url}/v1/users/{channel.adp_user_id}/sessions",
            json={},
            headers=adp_headers,
        )
        resp.raise_for_status()
        session_id = resp.json()["session_id"]
        _increment_sessions(conn, channel.channel_id)

    # 2. Fetch context from ADP
    ctx_resp = httpx.post(
        f"{settings.channels_adp_url}/v1/context",
        json={"user_id": channel.adp_user_id, "session_id": session_id},
        headers=adp_headers,
    )
    ctx_resp.raise_for_status()
    context = ctx_resp.json()

    # 3. Build history for Agent Runtime
    history = [{"role": m["role"], "content": m["content"]} for m in context.get("messages", [])]

    # 4. Call Agent Runtime
    rt_resp = httpx.post(
        f"{settings.channels_runtime_url}/query",
        json={"question": message, "history": history},
    )
    rt_resp.raise_for_status()
    result = rt_resp.json()
    reply = result.get("answer", "")
    citations = result.get("citations", [])
    trace = result.get("trace", {})

    # 5. Persist both turns to ADP
    httpx.post(
        f"{settings.channels_adp_url}/v1/sessions/{session_id}/messages/batch",
        json=[
            {"role": "user", "content": message},
            {"role": "assistant", "content": reply, "metadata": {"citations": citations, "trace": trace}},
        ],
        headers=adp_headers,
    ).raise_for_status()

    # 6. Update channel stats
    _increment_messages(conn, channel.channel_id)

    return ChatResponse(reply=reply, session_id=session_id, citations=citations, trace=trace)


def _increment_messages(conn: sqlite3.Connection, channel_id: str) -> None:
    now = _now()
    conn.execute(
        "UPDATE channel_stats SET total_messages=total_messages+1, last_active_at=? WHERE channel_id=?",
        (now, channel_id),
    )
    conn.commit()


def _increment_sessions(conn: sqlite3.Connection, channel_id: str) -> None:
    conn.execute(
        "UPDATE channel_stats SET total_sessions=total_sessions+1 WHERE channel_id=?",
        (channel_id,),
    )
    conn.commit()
