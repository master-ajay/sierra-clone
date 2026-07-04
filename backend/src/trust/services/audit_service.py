import json
import sqlite3
import uuid
from datetime import datetime, timezone

from trust.models.check import AuditRecord, Flag


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_audit(
    conn: sqlite3.Connection, channel_id: str, direction: str, message_clean: str, flags: list[Flag] | list[dict], allowed: bool
) -> AuditRecord:
    audit_id = str(uuid.uuid4())
    serialized = json.dumps([f.model_dump() if isinstance(f, Flag) else f for f in flags])
    conn.execute(
        "INSERT INTO trust_audit_log (audit_id, channel_id, direction, message_clean, flags, allowed, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (audit_id, channel_id, direction, message_clean, serialized, 1 if allowed else 0, _now()),
    )
    conn.commit()
    return get_audit(conn, audit_id)  # type: ignore[return-value]


def _row_to_record(row: sqlite3.Row) -> AuditRecord:
    return AuditRecord(
        audit_id=row["audit_id"],
        channel_id=row["channel_id"],
        direction=row["direction"],
        message_clean=row["message_clean"],
        flags=[Flag(**f) for f in json.loads(row["flags"])],
        allowed=bool(row["allowed"]),
        created_at=row["created_at"],
    )


def get_audit(conn: sqlite3.Connection, audit_id: str) -> AuditRecord | None:
    row = conn.execute("SELECT * FROM trust_audit_log WHERE audit_id=?", (audit_id,)).fetchone()
    return _row_to_record(row) if row else None


def list_audit(conn: sqlite3.Connection, cursor: str | None, limit: int) -> tuple[list[AuditRecord], str | None]:
    if cursor:
        rows = conn.execute(
            "SELECT * FROM trust_audit_log WHERE created_at<? ORDER BY created_at DESC LIMIT ?", (cursor, limit + 1)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM trust_audit_log ORDER BY created_at DESC LIMIT ?", (limit + 1,)).fetchall()
    has_more = len(rows) > limit
    items = [_row_to_record(r) for r in rows[:limit]]
    return items, items[-1].created_at if has_more else None


def get_stats(conn: sqlite3.Connection) -> dict:
    total = conn.execute("SELECT COUNT(*) FROM trust_audit_log").fetchone()[0]
    blocked = conn.execute("SELECT COUNT(*) FROM trust_audit_log WHERE allowed=0").fetchone()[0]
    pii = conn.execute("SELECT COUNT(*) FROM trust_audit_log WHERE flags LIKE '%\"type\": \"pii\"%'").fetchone()[0]
    injection = conn.execute(
        "SELECT COUNT(*) FROM trust_audit_log WHERE flags LIKE '%\"type\": \"prompt_injection\"%'"
    ).fetchone()[0]
    rate = conn.execute("SELECT COUNT(*) FROM trust_audit_log WHERE flags LIKE '%\"type\": \"rate_limit\"%'").fetchone()[0]
    return {
        "total_checks": total,
        "total_blocked": blocked,
        "flags_by_type": {"pii": pii, "prompt_injection": injection, "rate_limit": rate},
        "block_rate": blocked / total if total else 0.0,
    }
