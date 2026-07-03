import sqlite3

from trust.services.audit_service import write_audit
from trust.services.injection import detect_injection
from trust.services.pii import redact_pii
from trust.services.rate_limiter import RateLimiter


def run_check(
    conn: sqlite3.Connection,
    rate_limiter: RateLimiter,
    message: str,
    channel_id: str,
    direction: str,
) -> dict:
    clean, flags = redact_pii(message)

    if direction == "inbound":
        flags += detect_injection(message)
        if not rate_limiter.allow(channel_id):
            flags.append(
                {
                    "type": "rate_limit",
                    "detail": f"rate limit exceeded ({rate_limiter.rpm} rpm)",
                    "severity": "block",
                }
            )

    allowed = not any(f["severity"] == "block" for f in flags)

    record = write_audit(
        conn,
        channel_id=channel_id,
        direction=direction,
        message_clean=clean,
        flags=flags,
        allowed=allowed,
    )

    return {
        "allowed": allowed,
        "message_clean": clean,
        "flags": flags,
        "audit_id": record.audit_id,
    }
