from trust.services.audit_service import get_audit, list_audit, write_audit


def test_write_and_get_audit(test_db):
    from trust.database import get_connection

    conn = get_connection(test_db)
    flags = [{"type": "pii", "detail": "email detected", "severity": "warn"}]
    record = write_audit(
        conn,
        channel_id="chan-1",
        direction="inbound",
        message_clean="Contact me at [EMAIL]",
        flags=flags,
        allowed=True,
    )
    assert record.channel_id == "chan-1"
    assert record.allowed is True
    assert record.flags[0].type == "pii"

    fetched = get_audit(conn, record.audit_id)
    assert fetched is not None
    assert fetched.audit_id == record.audit_id
    assert fetched.message_clean == "Contact me at [EMAIL]"


def test_get_audit_never_contains_raw_pii(test_db):
    from trust.database import get_connection

    conn = get_connection(test_db)
    record = write_audit(
        conn,
        channel_id="chan-1",
        direction="inbound",
        message_clean="[EMAIL] wants a refund",
        flags=[{"type": "pii", "detail": "email detected", "severity": "warn"}],
        allowed=True,
    )
    fetched = get_audit(conn, record.audit_id)
    assert "@" not in fetched.message_clean


def test_get_audit_missing_returns_none(test_db):
    from trust.database import get_connection

    conn = get_connection(test_db)
    assert get_audit(conn, "does-not-exist") is None


def test_list_audit_reverse_chronological_and_paginated(test_db):
    from trust.database import get_connection

    conn = get_connection(test_db)
    for i in range(5):
        write_audit(
            conn,
            channel_id="chan-1",
            direction="inbound",
            message_clean=f"message {i}",
            flags=[],
            allowed=True,
        )

    items, next_cursor = list_audit(conn, cursor=None, limit=3)
    assert len(items) == 3
    assert next_cursor is not None
    # most recent (message 4) should come first
    assert items[0].message_clean == "message 4"

    more_items, next_cursor2 = list_audit(conn, cursor=next_cursor, limit=3)
    assert len(more_items) == 2
    assert next_cursor2 is None
