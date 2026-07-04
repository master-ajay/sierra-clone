-- Insights addendum: period-over-period trend data. Everything else in
-- Explorer is live-query-only (no history once a window moves on); this is
-- the one table that persists a daily snapshot per agent+channel so trend
-- comparisons don't require re-aggregating raw ADP messages every request.
CREATE TABLE IF NOT EXISTS daily_rollups (
    rollup_date          TEXT NOT NULL,
    agent_id             TEXT NOT NULL,
    channel_id           TEXT NOT NULL,
    session_count        INTEGER NOT NULL DEFAULT 0,
    message_count        INTEGER NOT NULL DEFAULT 0,
    avg_confidence_score REAL,
    guardrail_pass_rate  REAL,
    computed_at          TEXT NOT NULL,
    PRIMARY KEY (rollup_date, agent_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_rollups_date ON daily_rollups(rollup_date);
