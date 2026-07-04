import json
import sqlite3
import uuid
from datetime import datetime, timezone

from adp.models.session import SessionCreate, SessionResponse, SessionUpdate


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_session(row: sqlite3.Row) -> SessionResponse:
    return SessionResponse(
        session_id=row["session_id"],
        user_id=row["user_id"],
        status=row["status"],
        metadata=json.loads(row["metadata"]),
        started_at=row["started_at"],
        updated_at=row["updated_at"],
        closed_at=row["closed_at"],
    )


def create_session(conn: sqlite3.Connection, user_id: str, data: SessionCreate) -> SessionResponse:
    session_id = str(uuid.uuid4())
    now = _now()
    conn.execute(
        "INSERT INTO adp_sessions (session_id, user_id, metadata, started_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, user_id, json.dumps(data.metadata), now, now),
    )
    conn.commit()
    return get_session(conn, session_id)  # type: ignore[return-value]


def get_session(conn: sqlite3.Connection, session_id: str) -> SessionResponse | None:
    row = conn.execute("SELECT * FROM adp_sessions WHERE session_id = ?", (session_id,)).fetchone()
    return _row_to_session(row) if row else None


def list_sessions(
    conn: sqlite3.Connection, user_id: str, status: str | None, cursor: str | None, limit: int
) -> tuple[list[SessionResponse], str | None]:
    if status and cursor:
        rows = conn.execute(
            "SELECT * FROM adp_sessions WHERE user_id=? AND status=? AND started_at<? ORDER BY started_at DESC LIMIT ?",
            (user_id, status, cursor, limit + 1),
        ).fetchall()
    elif status:
        rows = conn.execute(
            "SELECT * FROM adp_sessions WHERE user_id=? AND status=? ORDER BY started_at DESC LIMIT ?",
            (user_id, status, limit + 1),
        ).fetchall()
    elif cursor:
        rows = conn.execute(
            "SELECT * FROM adp_sessions WHERE user_id=? AND started_at<? ORDER BY started_at DESC LIMIT ?",
            (user_id, cursor, limit + 1),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM adp_sessions WHERE user_id=? ORDER BY started_at DESC LIMIT ?",
            (user_id, limit + 1),
        ).fetchall()
    has_more = len(rows) > limit
    items = [_row_to_session(r) for r in rows[:limit]]
    next_cursor = items[-1].started_at if has_more else None
    return items, next_cursor


def update_session(conn: sqlite3.Connection, session_id: str, data: SessionUpdate) -> SessionResponse | None:
    session = get_session(conn, session_id)
    if not session:
        return None
    new_meta = data.metadata if data.metadata is not None else session.metadata
    new_status = data.status if data.status is not None else session.status
    now = _now()
    conn.execute(
        "UPDATE adp_sessions SET metadata=?, status=?, updated_at=? WHERE session_id=?",
        (json.dumps(new_meta), new_status, now, session_id),
    )
    conn.commit()
    return get_session(conn, session_id)


def close_session(conn: sqlite3.Connection, session_id: str) -> SessionResponse | None:
    session = get_session(conn, session_id)
    if not session:
        return None
    now = _now()
    conn.execute(
        "UPDATE adp_sessions SET status='closed', closed_at=?, updated_at=? WHERE session_id=?",
        (now, now, session_id),
    )
    conn.commit()
    return get_session(conn, session_id)
