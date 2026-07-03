import sqlite3

from trust.config import Settings
from trust.models.check import CheckRequest, CheckResponse
from trust.services.audit_service import write_audit
from trust.services.injection import scan_injection
from trust.services.pii import scan_pii
from trust.services.rate_limiter import check_rate_limit


def run_check(conn: sqlite3.Connection, req: CheckRequest, settings: Settings) -> CheckResponse:
    flags = []

    # 1. Rate limit (inbound only — no point rate-limiting our own outbound replies)
    if req.direction == "inbound":
        flags += check_rate_limit(req.channel_id, settings.trust_rate_limit_rpm)

    # 2. Prompt injection (inbound only)
    if req.direction == "inbound" and not any(f.severity == "block" for f in flags):
        if settings.trust_injection_block:
            flags += scan_injection(req.message)

    # 3. PII (both directions)
    message_clean, pii_flags = scan_pii(req.message)
    flags += pii_flags

    allowed = not any(f.severity == "block" for f in flags)
    record = write_audit(conn, req.channel_id, req.direction, message_clean, flags, allowed)
    return CheckResponse(allowed=allowed, message_clean=message_clean, flags=flags, audit_id=record.audit_id)
