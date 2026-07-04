CREATE TABLE IF NOT EXISTS trust_audit_log (
    audit_id      TEXT PRIMARY KEY,
    channel_id    TEXT NOT NULL,
    direction     TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
    message_clean TEXT NOT NULL,
    flags         TEXT NOT NULL,
    allowed       INTEGER NOT NULL,
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trust_audit_channel ON trust_audit_log(channel_id);
CREATE INDEX IF NOT EXISTS idx_trust_audit_created ON trust_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_trust_audit_allowed ON trust_audit_log(allowed);
