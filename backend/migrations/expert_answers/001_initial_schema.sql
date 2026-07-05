CREATE TABLE IF NOT EXISTS expert_answers_resolutions (
    resolution_id     TEXT PRIMARY KEY,
    conversation_id   TEXT NOT NULL,
    adp_session_id    TEXT,
    transcript_json   TEXT NOT NULL,
    resolution_note   TEXT NOT NULL,
    topic             TEXT,
    status            TEXT NOT NULL DEFAULT 'pending_draft'
                        CHECK(status IN ('pending_draft','draft_failed','drafted')),
    created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expert_answers_knowledge_articles (
    article_id    TEXT PRIMARY KEY,
    resolution_id TEXT NOT NULL REFERENCES expert_answers_resolutions(resolution_id),
    title         TEXT NOT NULL,
    body          TEXT NOT NULL,
    cited_excerpt TEXT NOT NULL,
    topic         TEXT,
    status        TEXT NOT NULL DEFAULT 'pending_review'
                    CHECK(status IN ('pending_review','approved','rejected','published')),
    published_at  TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expert_answers_articles_status ON expert_answers_knowledge_articles(status);
CREATE INDEX IF NOT EXISTS idx_expert_answers_articles_topic  ON expert_answers_knowledge_articles(topic);
CREATE INDEX IF NOT EXISTS idx_expert_answers_resolutions_topic ON expert_answers_resolutions(topic);
