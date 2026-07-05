import logging
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone

import httpx

from voice.config import Settings
from voice.models.line import LineCreate, LineResponse, LineUpdate

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_line(row: sqlite3.Row) -> LineResponse:
    return LineResponse(
        line_id=row["line_id"],
        agent_id=row["agent_id"],
        adp_user_id=row["adp_user_id"],
        name=row["name"],
        status=row["status"],
        line_key=row["line_key"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def create_line(conn: sqlite3.Connection, data: LineCreate, settings: Settings) -> LineResponse:
    line_id = str(uuid.uuid4())
    # Register a real ADP user for this line's synthetic identity so that
    # open_call can create sessions for it (identical pattern to Channels).
    try:
        adp_resp = httpx.post(
            f"{settings.voice_adp_url}/v1/users",
            json={"display_name": f"line:{data.name}"},
            headers={"X-API-Key": settings.voice_adp_api_key},
        )
        adp_resp.raise_for_status()
        adp_user_id = adp_resp.json()["user_id"]
    except httpx.HTTPStatusError as exc:
        logger.error("adp_user_create_failed: line_name=%s status=%d", data.name, exc.response.status_code)
        raise
    except httpx.RequestError as exc:
        logger.error("adp_unreachable: line_name=%s error=%s", data.name, exc)
        raise
    line_key = secrets.token_hex(32)  # 64 hex chars
    now = _now()
    conn.execute(
        "INSERT INTO voice_lines (line_id, agent_id, adp_user_id, name, line_key, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (line_id, data.agent_id, adp_user_id, data.name, line_key, now, now),
    )
    conn.commit()
    return get_line(conn, line_id)  # type: ignore[return-value]


def get_line(conn: sqlite3.Connection, line_id: str) -> LineResponse | None:
    row = conn.execute("SELECT * FROM voice_lines WHERE line_id=?", (line_id,)).fetchone()
    return _row_to_line(row) if row else None


def get_line_by_key(conn: sqlite3.Connection, line_key: str) -> LineResponse | None:
    row = conn.execute("SELECT * FROM voice_lines WHERE line_key=?", (line_key,)).fetchone()
    return _row_to_line(row) if row else None


def list_lines(
    conn: sqlite3.Connection, agent_id: str | None, status: str | None, cursor: str | None, limit: int
) -> tuple[list[LineResponse], str | None]:
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
    rows = conn.execute(f"SELECT * FROM voice_lines {where} ORDER BY created_at DESC LIMIT ?", params).fetchall()
    has_more = len(rows) > limit
    items = [_row_to_line(r) for r in rows[:limit]]
    next_cursor = items[-1].created_at if has_more else None
    return items, next_cursor


def update_line(conn: sqlite3.Connection, line_id: str, data: LineUpdate) -> LineResponse | None:
    line = get_line(conn, line_id)
    if not line:
        return None
    new_name = data.name if data.name is not None else line.name
    new_status = data.status if data.status is not None else line.status
    now = _now()
    conn.execute(
        "UPDATE voice_lines SET name=?, status=?, updated_at=? WHERE line_id=?",
        (new_name, new_status, now, line_id),
    )
    conn.commit()
    return get_line(conn, line_id)


def revoke_line(conn: sqlite3.Connection, line_id: str) -> bool:
    now = _now()
    result = conn.execute(
        "UPDATE voice_lines SET status='revoked', updated_at=? WHERE line_id=?",
        (now, line_id),
    )
    conn.commit()
    return result.rowcount > 0
