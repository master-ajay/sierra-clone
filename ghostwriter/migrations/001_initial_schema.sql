CREATE TABLE IF NOT EXISTS articles (
    article_id   TEXT PRIMARY KEY,
    source_id    TEXT UNIQUE,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','indexed','error')),
    error_detail TEXT,
    word_count   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_status    ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_updated   ON articles(updated_at);
