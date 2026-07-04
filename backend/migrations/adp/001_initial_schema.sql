CREATE TABLE IF NOT EXISTS adp_users (
    user_id       TEXT PRIMARY KEY,
    external_id   TEXT UNIQUE,
    display_name  TEXT NOT NULL,
    metadata      TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS adp_sessions (
    session_id    TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES adp_users(user_id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    metadata      TEXT NOT NULL DEFAULT '{}',
    started_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    closed_at     TEXT
);

CREATE TABLE IF NOT EXISTS adp_messages (
    message_id    TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES adp_sessions(session_id) ON DELETE CASCADE,
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content       TEXT NOT NULL,
    metadata      TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_adp_sessions_user_id ON adp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_adp_sessions_status ON adp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_adp_messages_session_id ON adp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_adp_messages_created_at ON adp_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_adp_users_external_id ON adp_users(external_id);
