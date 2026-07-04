CREATE TABLE IF NOT EXISTS lines (
    line_id      TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    adp_user_id  TEXT NOT NULL,
    name         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','revoked')),
    line_key     TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
    call_id           TEXT PRIMARY KEY,
    line_id           TEXT NOT NULL REFERENCES lines(line_id),
    session_id        TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'active'
                        CHECK(status IN ('active','escalated','completed')),
    sentiment_trend_json TEXT NOT NULL DEFAULT '[]',
    created_at        TEXT NOT NULL,
    ended_at          TEXT
);

CREATE TABLE IF NOT EXISTS payment_attempts (
    payment_id         TEXT PRIMARY KEY,
    call_id            TEXT NOT NULL REFERENCES calls(call_id),
    masked_card_last4  TEXT NOT NULL,
    amount             REAL NOT NULL,
    currency           TEXT NOT NULL,
    status             TEXT NOT NULL CHECK(status IN ('collected','blocked')),
    created_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lines_agent_id ON lines(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_line_id  ON calls(line_id);
