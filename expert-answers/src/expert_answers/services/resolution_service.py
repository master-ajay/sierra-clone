import json
import sqlite3
import uuid
from datetime import datetime, timezone

from expert_answers.models.resolution import ResolutionResponse


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_resolution(conn: sqlite3.Connection, conversation_id: str, transcript: list[dict], adp_session_id: str | None, resolution_note: str, topic: str | None) -> ResolutionResponse:
    resolution_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO resolutions (resolution_id, conversation_id, adp_session_id, transcript_json, resolution_note, topic, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (resolution_id, conversation_id, adp_session_id, json.dumps(transcript), resolution_note, topic, "pending_draft", _now()),
    )
    conn.commit()
    return get_resolution(conn, resolution_id)  # type: ignore[return-value]


def get_resolution(conn: sqlite3.Connection, resolution_id: str) -> ResolutionResponse | None:
    row = conn.execute("SELECT * FROM resolutions WHERE resolution_id=?", (resolution_id,)).fetchone()
    if not row:
        return None
    return ResolutionResponse(
        resolution_id=row["resolution_id"],
        conversation_id=row["conversation_id"],
        adp_session_id=row["adp_session_id"],
        resolution_note=row["resolution_note"],
        topic=row["topic"],
        status=row["status"],
        created_at=row["created_at"],
    )


def get_resolution_transcript(conn: sqlite3.Connection, resolution_id: str) -> list[dict]:
    row = conn.execute("SELECT transcript_json FROM resolutions WHERE resolution_id=?", (resolution_id,)).fetchone()
    return json.loads(row["transcript_json"]) if row else []


def set_resolution_status(conn: sqlite3.Connection, resolution_id: str, status: str) -> None:
    conn.execute("UPDATE resolutions SET status=? WHERE resolution_id=?", (status, resolution_id))
    conn.commit()


def get_prior_resolutions(conn: sqlite3.Connection, topic: str, limit: int = 3) -> list[dict]:
    rows = conn.execute(
        "SELECT resolution_id, transcript_json, resolution_note FROM resolutions WHERE topic=? AND status='drafted' ORDER BY created_at DESC LIMIT ?",
        (topic, limit),
    ).fetchall()
    return [{"resolution_id": r["resolution_id"], "transcript": json.loads(r["transcript_json"]), "resolution_note": r["resolution_note"]} for r in rows]
