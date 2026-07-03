import json
import sqlite3
import uuid
from datetime import datetime, timezone

from adp.models.message import MessageCreate, MessageResponse


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_message(row: sqlite3.Row) -> MessageResponse:
    return MessageResponse(
        message_id=row["message_id"],
        session_id=row["session_id"],
        role=row["role"],
        content=row["content"],
        metadata=json.loads(row["metadata"]),
        created_at=row["created_at"],
    )


def append_message(conn: sqlite3.Connection, session_id: str, data: MessageCreate) -> MessageResponse:
    message_id = str(uuid.uuid4())
    now = _now()
    conn.execute(
        "INSERT INTO messages (message_id, session_id, role, content, metadata, created_at) VALUES (?,?,?,?,?,?)",
        (message_id, session_id, data.role, data.content, json.dumps(data.metadata), now),
    )
    conn.execute("UPDATE sessions SET updated_at=? WHERE session_id=?", (now, session_id))
    conn.commit()
    row = conn.execute("SELECT * FROM messages WHERE message_id=?", (message_id,)).fetchone()
    return _row_to_message(row)


def batch_append(conn: sqlite3.Connection, session_id: str, messages: list[MessageCreate]) -> list[MessageResponse]:
    results = []
    for msg in messages:
        results.append(append_message(conn, session_id, msg))
    return results


def list_messages(
    conn: sqlite3.Connection, session_id: str, cursor: str | None, limit: int
) -> tuple[list[MessageResponse], str | None]:
    if cursor:
        rows = conn.execute(
            "SELECT * FROM messages WHERE session_id=? AND created_at>? ORDER BY created_at ASC LIMIT ?",
            (session_id, cursor, limit + 1),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC LIMIT ?",
            (session_id, limit + 1),
        ).fetchall()
    has_more = len(rows) > limit
    items = [_row_to_message(r) for r in rows[:limit]]
    next_cursor = items[-1].created_at if has_more else None
    return items, next_cursor
