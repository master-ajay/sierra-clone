import secrets
import sqlite3
import uuid
from datetime import datetime, timezone

from channels.models.channel import ChannelCreate, ChannelResponse, ChannelUpdate


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_channel(row: sqlite3.Row) -> ChannelResponse:
    return ChannelResponse(
        channel_id=row["channel_id"],
        agent_id=row["agent_id"],
        adp_user_id=row["adp_user_id"],
        name=row["name"],
        type=row["type"],
        status=row["status"],
        channel_key=row["channel_key"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def create_channel(conn: sqlite3.Connection, data: ChannelCreate) -> ChannelResponse:
    channel_id = str(uuid.uuid4())
    adp_user_id = str(uuid.uuid4())  # synthetic ADP user for this channel
    channel_key = secrets.token_hex(32)  # 64 hex chars
    now = _now()
    conn.execute(
        "INSERT INTO channels (channel_id, agent_id, adp_user_id, name, type, channel_key, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (channel_id, data.agent_id, adp_user_id, data.name, data.type, channel_key, now, now),
    )
    conn.execute("INSERT INTO channel_stats (channel_id) VALUES (?)", (channel_id,))
    conn.commit()
    return get_channel(conn, channel_id)  # type: ignore[return-value]


def get_channel(conn: sqlite3.Connection, channel_id: str) -> ChannelResponse | None:
    row = conn.execute("SELECT * FROM channels WHERE channel_id=?", (channel_id,)).fetchone()
    return _row_to_channel(row) if row else None


def get_channel_by_key(conn: sqlite3.Connection, channel_key: str) -> ChannelResponse | None:
    row = conn.execute("SELECT * FROM channels WHERE channel_key=?", (channel_key,)).fetchone()
    return _row_to_channel(row) if row else None


def list_channels(
    conn: sqlite3.Connection, agent_id: str | None, status: str | None, cursor: str | None, limit: int
) -> tuple[list[ChannelResponse], str | None]:
    conditions = []
    params: list = []
    if agent_id:
        conditions.append("agent_id=?")
        params.append(agent_id)
    if status:
        conditions.append("status=?")
        params.append(status)
    if cursor:
        conditions.append("created_at<?")
        params.append(cursor)
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    params.append(limit + 1)
    rows = conn.execute(f"SELECT * FROM channels {where} ORDER BY created_at DESC LIMIT ?", params).fetchall()
    has_more = len(rows) > limit
    items = [_row_to_channel(r) for r in rows[:limit]]
    next_cursor = items[-1].created_at if has_more else None
    return items, next_cursor


def update_channel(conn: sqlite3.Connection, channel_id: str, data: ChannelUpdate) -> ChannelResponse | None:
    channel = get_channel(conn, channel_id)
    if not channel:
        return None
    new_name = data.name if data.name is not None else channel.name
    new_status = data.status if data.status is not None else channel.status
    now = _now()
    conn.execute(
        "UPDATE channels SET name=?, status=?, updated_at=? WHERE channel_id=?",
        (new_name, new_status, now, channel_id),
    )
    conn.commit()
    return get_channel(conn, channel_id)


def delete_channel(conn: sqlite3.Connection, channel_id: str) -> bool:
    result = conn.execute("DELETE FROM channels WHERE channel_id=?", (channel_id,))
    conn.commit()
    return result.rowcount > 0
