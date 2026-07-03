import sqlite3

from adp.models.message import MessageResponse
from adp.services.message_service import _row_to_message


def search_messages(
    conn: sqlite3.Connection, user_id: str, query: str, cursor: str | None, limit: int
) -> tuple[list[MessageResponse], str | None]:
    pattern = f"%{query}%"
    if cursor:
        rows = conn.execute(
            "SELECT m.* FROM messages m "
            "JOIN sessions s ON m.session_id = s.session_id "
            "WHERE s.user_id=? AND m.content LIKE ? COLLATE NOCASE AND m.created_at>? "
            "ORDER BY m.created_at ASC LIMIT ?",
            (user_id, pattern, cursor, limit + 1),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT m.* FROM messages m "
            "JOIN sessions s ON m.session_id = s.session_id "
            "WHERE s.user_id=? AND m.content LIKE ? COLLATE NOCASE "
            "ORDER BY m.created_at ASC LIMIT ?",
            (user_id, pattern, limit + 1),
        ).fetchall()
    has_more = len(rows) > limit
    items = [_row_to_message(r) for r in rows[:limit]]
    next_cursor = items[-1].created_at if has_more else None
    return items, next_cursor
