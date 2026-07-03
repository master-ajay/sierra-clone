import json
import sqlite3
import uuid
from datetime import datetime, timezone

from trust.models.check import AuditRecord, Flag


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_audit(row: sqlite3.Row) -> AuditRecord:
    return AuditRecord(
        audit_id=row["audit_id"],
        channel_id=row["channel_id"],
        direction=row["direction"],
        message_clean=row["message_clean"],
        flags=[Flag(**f) for f in json.loads(row["flags"])],
        allowed=bool(row["allowed"]),
        created_at=row["created_at"],
    )


def write_audit(
    conn: sqlite3.Connection,
    channel_id: str,
    direction: str,
    message_clean: str,
    flags: list[dict],
    allowed: bool,
) -> AuditRecord:
    audit_id = str(uuid.uuid4())
    now = _now()
    conn.execute(
        "INSERT INTO audit_log (audit_id, channel_id, direction, message_clean, flags, allowed, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (audit_id, channel_id, direction, message_clean, json.dumps(flags), int(allowed), now),
    )
    conn.commit()
    return get_audit(conn, audit_id)  # type: ignore[return-value]


def get_audit(conn: sqlite3.Connection, audit_id: str) -> AuditRecord | None:
    row = conn.execute("SELECT * FROM audit_log WHERE audit_id = ?", (audit_id,)).fetchone()
    return _row_to_audit(row) if row else None


def list_audit(
    conn: sqlite3.Connection, cursor: str | None, limit: int
) -> tuple[list[AuditRecord], str | None]:
    if cursor:
        rows = conn.execute(
            "SELECT * FROM audit_log WHERE created_at < ? ORDER BY created_at DESC LIMIT ?",
            (cursor, limit + 1),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?",
            (limit + 1,),
        ).fetchall()
    has_more = len(rows) > limit
    items = [_row_to_audit(r) for r in rows[:limit]]
    next_cursor = items[-1].created_at if has_more else None
    return items, next_cursor


def get_stats(conn: sqlite3.Connection) -> dict:
    rows = conn.execute("SELECT flags, allowed FROM audit_log").fetchall()
    total_checks = len(rows)
    total_blocked = sum(1 for r in rows if not r["allowed"])
    flags_by_type = {"pii": 0, "prompt_injection": 0, "rate_limit": 0}
    for row in rows:
        for flag in json.loads(row["flags"]):
            flags_by_type[flag["type"]] += 1
    block_rate = total_blocked / total_checks if total_checks else 0.0
    return {
        "total_checks": total_checks,
        "total_blocked": total_blocked,
        "flags_by_type": flags_by_type,
        "block_rate": block_rate,
    }
