import json
import sqlite3
import uuid
from datetime import datetime, timezone

from adp.models.user import UserCreate, UserResponse, UserUpdate


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_user(row: sqlite3.Row) -> UserResponse:
    return UserResponse(
        user_id=row["user_id"],
        external_id=row["external_id"],
        display_name=row["display_name"],
        metadata=json.loads(row["metadata"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def create_user(conn: sqlite3.Connection, data: UserCreate) -> UserResponse:
    user_id = str(uuid.uuid4())
    now = _now()
    conn.execute(
        "INSERT INTO users (user_id, external_id, display_name, metadata, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, data.external_id, data.display_name, json.dumps(data.metadata), now, now),
    )
    conn.commit()
    return get_user(conn, user_id)  # type: ignore[return-value]


def get_user(conn: sqlite3.Connection, user_id: str) -> UserResponse | None:
    row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    return _row_to_user(row) if row else None


def get_user_by_external_id(conn: sqlite3.Connection, external_id: str) -> UserResponse | None:
    row = conn.execute("SELECT * FROM users WHERE external_id = ?", (external_id,)).fetchone()
    return _row_to_user(row) if row else None


def list_users(conn: sqlite3.Connection, cursor: str | None, limit: int) -> tuple[list[UserResponse], str | None]:
    if cursor:
        rows = conn.execute(
            "SELECT * FROM users WHERE created_at < ? ORDER BY created_at DESC LIMIT ?",
            (cursor, limit + 1),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT ?", (limit + 1,)
        ).fetchall()
    has_more = len(rows) > limit
    items = [_row_to_user(r) for r in rows[:limit]]
    next_cursor = items[-1].created_at if has_more else None
    return items, next_cursor


def update_user(conn: sqlite3.Connection, user_id: str, data: UserUpdate) -> UserResponse | None:
    user = get_user(conn, user_id)
    if not user:
        return None
    new_name = data.display_name if data.display_name is not None else user.display_name
    new_meta = data.metadata if data.metadata is not None else user.metadata
    now = _now()
    conn.execute(
        "UPDATE users SET display_name = ?, metadata = ?, updated_at = ? WHERE user_id = ?",
        (new_name, json.dumps(new_meta), now, user_id),
    )
    conn.commit()
    return get_user(conn, user_id)


def delete_user(conn: sqlite3.Connection, user_id: str) -> bool:
    result = conn.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
    conn.commit()
    return result.rowcount > 0
