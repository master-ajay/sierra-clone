import json
import logging
import sqlite3
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException

from voice.config import Settings
from voice.models.call import CallResponse, TurnResponse
from voice.services.sentiment_service import score_sentiment

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _err(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message, "details": {}}}


def _row_to_call(row: sqlite3.Row) -> CallResponse:
    return CallResponse(
        call_id=row["call_id"],
        line_id=row["line_id"],
        session_id=row["session_id"],
        status=row["status"],
        sentiment_trend_json=row["sentiment_trend_json"],
        created_at=row["created_at"],
        ended_at=row["ended_at"],
    )


def open_call(conn: sqlite3.Connection, line_id: str, line_key: str, settings: Settings) -> CallResponse:
    row = conn.execute("SELECT * FROM lines WHERE line_id=?", (line_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=_err("not_found", "Line not found"))
    if row["line_key"] != line_key:
        raise HTTPException(status_code=401, detail=_err("unauthorized", "Invalid line key"))
    if row["status"] != "active":
        raise HTTPException(status_code=503, detail=_err("call_unavailable", "Line is not active"))

    adp_user_id = row["adp_user_id"]
    adp_headers = {"X-API-Key": settings.voice_adp_api_key}

    try:
        resp = httpx.post(
            f"{settings.voice_adp_url}/v1/users/{adp_user_id}/sessions",
            json={},
            headers=adp_headers,
        )
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("adp_session_open_failed: line_id=%s status=%d", line_id, exc.response.status_code)
        raise
    except httpx.RequestError as exc:
        logger.error("adp_unreachable: line_id=%s error=%s", line_id, exc)
        raise
    session_id = resp.json()["session_id"]

    call_id = str(uuid.uuid4())
    now = _now()
    conn.execute(
        "INSERT INTO calls (call_id, line_id, session_id, created_at) VALUES (?, ?, ?, ?)",
        (call_id, line_id, session_id, now),
    )
    conn.commit()
    return _row_to_call(conn.execute("SELECT * FROM calls WHERE call_id=?", (call_id,)).fetchone())


def exchange_turn(conn: sqlite3.Connection, call_id: str, text: str, line_key: str, settings: Settings) -> TurnResponse:
    call_row = conn.execute("SELECT * FROM calls WHERE call_id=?", (call_id,)).fetchone()
    if not call_row:
        raise HTTPException(status_code=404, detail=_err("not_found", "Call not found"))

    line_row = conn.execute("SELECT * FROM lines WHERE line_id=?", (call_row["line_id"],)).fetchone()
    if not line_row:
        raise HTTPException(status_code=404, detail=_err("not_found", "Line not found"))

    if line_row["line_key"] != line_key:
        raise HTTPException(status_code=401, detail=_err("unauthorized", "Invalid line key"))

    if line_row["status"] != "active":
        raise HTTPException(status_code=503, detail=_err("call_unavailable", "Line is not active"))

    if call_row["status"] == "completed":
        raise HTTPException(status_code=503, detail=_err("call_unavailable", "Call has ended"))

    adp_user_id = line_row["adp_user_id"]
    session_id = call_row["session_id"]
    adp_headers = {"X-API-Key": settings.voice_adp_api_key}

    # 1. Trust & Reliability — check inbound turn before processing
    try:
        trust_resp = httpx.post(
            f"{settings.voice_trust_url}/v1/check",
            json={"message": text, "channel_id": call_id, "direction": "inbound"},
            headers={"X-API-Key": settings.voice_trust_api_key},
        )
        trust_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("trust_check_failed: call_id=%s status=%d", call_id, exc.response.status_code)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "Trust check failed"))
    except httpx.RequestError as exc:
        logger.error("trust_unreachable: call_id=%s error=%s", call_id, exc)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "Trust unreachable"))
    trust_result = trust_resp.json()
    if not trust_result.get("allowed", True):
        raise HTTPException(status_code=403, detail=_err("message_blocked", "Turn blocked by Trust & Reliability guardrails"))
    text_clean = trust_result.get("message_clean", text)

    # 2. Load context from ADP
    try:
        ctx_resp = httpx.post(
            f"{settings.voice_adp_url}/v1/context",
            json={"user_id": adp_user_id, "session_id": session_id},
            headers=adp_headers,
        )
        ctx_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("adp_context_fetch_failed: call_id=%s status=%d", call_id, exc.response.status_code)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "ADP context fetch failed"))
    except httpx.RequestError as exc:
        logger.error("adp_unreachable: call_id=%s error=%s", call_id, exc)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "ADP unreachable"))
    context = ctx_resp.json()
    history = [{"role": m["role"], "content": m["content"]} for m in context.get("messages", [])]

    # 3. Call Agent Runtime for reply (use sanitized text)
    try:
        rt_resp = httpx.post(
            f"{settings.voice_runtime_url}/query",
            json={"question": text_clean, "history": history},
        )
        rt_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("agent_runtime_query_failed: call_id=%s status=%d", call_id, exc.response.status_code)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "Agent Runtime error"))
    except httpx.RequestError as exc:
        logger.error("agent_runtime_unreachable: call_id=%s error=%s", call_id, exc)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "Agent Runtime unreachable"))
    result = rt_resp.json()
    reply = result.get("answer", "")

    # 4. Score sentiment via Agent Runtime
    try:
        sentiment_prompt = (
            f"Score the sentiment of this text on a scale from -1 (very negative) to 1 (very positive). "
            f'Reply with JSON only: {{"label": "positive|negative|neutral", "score": <float>}}. '
            f"Text: {text}"
        )
        sent_resp = httpx.post(
            f"{settings.voice_runtime_url}/query",
            json={"question": sentiment_prompt, "history": []},
        )
        sent_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("sentiment_scoring_failed: call_id=%s status=%d", call_id, exc.response.status_code)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "Sentiment scoring error"))
    except httpx.RequestError as exc:
        logger.error("agent_runtime_unreachable: call_id=%s error=%s", call_id, exc)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "Agent Runtime unreachable"))
    sentiment = score_sentiment(sent_resp.json())

    # 5. Save turns to ADP (persist sanitized text)
    try:
        httpx.post(
            f"{settings.voice_adp_url}/v1/sessions/{session_id}/messages/batch",
            json=[
                {"role": "user", "content": text_clean},
                {"role": "assistant", "content": reply, "metadata": {"sentiment": sentiment}},
            ],
            headers=adp_headers,
        ).raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("adp_batch_persist_failed: call_id=%s status=%d", call_id, exc.response.status_code)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "ADP persist failed"))
    except httpx.RequestError as exc:
        logger.error("adp_unreachable: call_id=%s error=%s", call_id, exc)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "ADP unreachable"))

    # 6. Update sentiment trend and recompute trailing 3-turn average
    trend: list[float] = json.loads(call_row["sentiment_trend_json"])
    trend.append(sentiment["score"])
    trailing = trend[-3:]
    avg = sum(trailing) / len(trailing) if trailing else 0.0
    escalation_recommended = avg < -0.5

    conn.execute(
        "UPDATE calls SET sentiment_trend_json=? WHERE call_id=?",
        (json.dumps(trend), call_id),
    )
    conn.commit()

    return TurnResponse(
        reply=reply,
        sentiment=sentiment,
        call_sentiment_trend=trend,
        escalation_recommended=escalation_recommended,
    )


def end_call(conn: sqlite3.Connection, call_id: str, line_key: str, settings: Settings) -> dict:
    call_row = conn.execute("SELECT * FROM calls WHERE call_id=?", (call_id,)).fetchone()
    if not call_row:
        raise HTTPException(status_code=404, detail=_err("not_found", "Call not found"))

    line_row = conn.execute("SELECT * FROM lines WHERE line_id=?", (call_row["line_id"],)).fetchone()
    if not line_row or line_row["line_key"] != line_key:
        raise HTTPException(status_code=401, detail=_err("unauthorized", "Invalid line key"))

    if call_row["status"] == "completed":
        raise HTTPException(status_code=503, detail=_err("call_unavailable", "Call already ended"))

    now = _now()
    conn.execute(
        "UPDATE calls SET status='completed', ended_at=? WHERE call_id=?",
        (now, call_id),
    )
    conn.commit()

    trend: list[float] = json.loads(call_row["sentiment_trend_json"])
    average_sentiment = sum(trend) / len(trend) if trend else 0.0
    if len(trend) >= 2:
        recent_half = trend[len(trend) // 2 :]
        early_half = trend[: len(trend) // 2]
        recent_avg = sum(recent_half) / len(recent_half)
        early_avg = sum(early_half) / len(early_half)
        if recent_avg > early_avg:
            trend_direction = "improving"
        elif recent_avg < early_avg:
            trend_direction = "declining"
        else:
            trend_direction = "stable"
    else:
        trend_direction = "stable"

    return {"average_sentiment": average_sentiment, "trend": trend_direction}


def escalate_call(conn: sqlite3.Connection, call_id: str, settings: Settings) -> dict:
    call_row = conn.execute("SELECT * FROM calls WHERE call_id=?", (call_id,)).fetchone()
    if not call_row:
        raise HTTPException(status_code=404, detail=_err("not_found", "Call not found"))

    if call_row["status"] == "completed":
        raise HTTPException(status_code=503, detail=_err("call_unavailable", "Call has ended"))

    session_id = call_row["session_id"]
    line_row = conn.execute("SELECT * FROM lines WHERE line_id=?", (call_row["line_id"],)).fetchone()
    adp_user_id = line_row["adp_user_id"] if line_row else ""
    adp_headers = {"X-API-Key": settings.voice_adp_api_key}

    try:
        ctx_resp = httpx.post(
            f"{settings.voice_adp_url}/v1/context",
            json={"user_id": adp_user_id, "session_id": session_id},
            headers=adp_headers,
        )
        ctx_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("adp_context_fetch_failed: call_id=%s status=%d", call_id, exc.response.status_code)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "ADP context fetch failed"))
    except httpx.RequestError as exc:
        logger.error("adp_unreachable: call_id=%s error=%s", call_id, exc)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "ADP unreachable"))
    context = ctx_resp.json()
    turns = context.get("messages", [])

    history_text = "\n".join(f"{m['role']}: {m['content']}" for m in turns)
    summary_prompt = f"Summarize this call for a human agent taking over:\n\n{history_text}"

    try:
        rt_resp = httpx.post(
            f"{settings.voice_runtime_url}/query",
            json={"question": summary_prompt, "history": []},
        )
        rt_resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("summary_generation_failed: call_id=%s status=%d", call_id, exc.response.status_code)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "Summary generation error"))
    except httpx.RequestError as exc:
        logger.error("agent_runtime_unreachable: call_id=%s error=%s", call_id, exc)
        raise HTTPException(status_code=502, detail=_err("upstream_error", "Agent Runtime unreachable"))

    summary = rt_resp.json().get("answer", "")

    conn.execute("UPDATE calls SET status='escalated' WHERE call_id=?", (call_id,))
    conn.commit()

    return {"summary": summary, "turns": turns}
