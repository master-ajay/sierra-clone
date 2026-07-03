CREATE TABLE IF NOT EXISTS channels (
    channel_id   TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    adp_user_id  TEXT NOT NULL,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL CHECK(type IN ('widget', 'api')),
    status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'revoked')),
    channel_key  TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_stats (
    channel_id      TEXT PRIMARY KEY REFERENCES channels(channel_id) ON DELETE CASCADE,
    total_messages  INTEGER NOT NULL DEFAULT 0,
    total_sessions  INTEGER NOT NULL DEFAULT 0,
    last_active_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_channels_agent_id ON channels(agent_id);
CREATE INDEX IF NOT EXISTS idx_channels_status   ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_key      ON channels(channel_key);
