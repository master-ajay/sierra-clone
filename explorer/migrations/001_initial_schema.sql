-- Tracks ADP user_ids that Explorer has seen, enabling cross-user queries
CREATE TABLE IF NOT EXISTS known_users (
    user_id     TEXT PRIMARY KEY,
    first_seen  TEXT NOT NULL
);
