# Product Spec: Expert Answers (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1

---

## 1. Problem Statement

When an agent built in Agent Studio hits a knowledge gap, the conversation is escalated
to a human care rep, who resolves it. Today that resolution vanishes — nobody captures
it back into the agent's knowledge base, so the next customer with the same question
hits the same wall. Expert Answers closes this loop: it turns resolved conversations
into grounded, human-reviewed knowledge articles that feed back into the Agent Runtime,
so resolution rates improve without extra manual content-authoring work from the care
team.

---

## 2. Goals (v1)

- G1: Accept a resolved conversation as input — either a full transcript submitted
  directly, or a reference to an existing ADP session — plus a short resolution note
  from the person who resolved it.
- G2: Draft a knowledge article from the resolution, grounded in the transcript and
  informed by any other resolutions tagged with the same topic.
- G3: Human-in-the-loop review: every draft is `pending_review` until a person
  approves, edits, or rejects it. Nothing publishes automatically.
- G4: Publish approved articles so the Agent Runtime can retrieve and cite them as a
  knowledge source in future conversations.
- G5: List and filter articles by status (`pending_review`, `published`, `rejected`)
  and by topic.

---

## 3. Non-Goals (explicitly out of scope for v1)

- No automatic detection of live handoff events from Channels — Channels v1 has no
  human handoff/escalation routing (see `channels-design.md` §3), so resolutions must
  be submitted explicitly via the API, not detected automatically from a live pipeline.
- No automatic publishing without human approval.
- No multi-language article generation — English only.
- No automatic versioning/superseding when a later resolution contradicts a published
  article — conflicts are resolved by manually editing the existing article.
- No integration with a human-agent copilot ("Live Assist" in Sierra's real lineup) —
  that is a distinct, unbuilt product.
- No topic discovery or trend clustering UI — Insights/Explorer own surfacing which
  topics have friction; Expert Answers only accepts an optional `topic` string, it
  does not compute one.

---

## 4. Users

**Primary — care team reviewer:** submits resolutions (or has them submitted on their
behalf), reviews AI-drafted articles, edits and approves/rejects them.

**Secondary — agent builder / ops:** has read-only visibility into which published
articles exist and where they came from, to understand why the agent's answers
changed.

---

## 5. Functional Requirements

### FR-1: Resolution ingestion

- FR-1.1 `POST /v1/resolutions` — body: `{ conversation_id, transcript?, adp_session_id?,
  resolution_note, topic? }`. Exactly one of `transcript` (list of `{role, content}`
  turns) or `adp_session_id` must be provided.
- FR-1.2 If `adp_session_id` is given, the service fetches the transcript from ADP
  (`GET /v1/sessions/{id}/messages`) rather than requiring the caller to pass it.
- FR-1.3 Creates a `resolution` record with status `pending_draft` and immediately
  triggers FR-2 (synchronous in v1 — no background job queue).

### FR-2: Draft generation

- FR-2.1 The service calls the Agent Runtime's completion endpoint with the
  transcript, the resolution note, and up to 3 prior resolutions sharing the same
  `topic` (simple exact-match lookup, no embeddings/vector search in v1), asking it to
  draft a title + body knowledge article grounded in the conversation.
- FR-2.2 The draft is stored as a `knowledge_article` with status `pending_review`,
  linked to its source `resolution_id`, and includes the cited excerpt from the
  transcript.
- FR-2.3 If the Agent Runtime call fails, the resolution is marked
  `draft_failed` and can be retried via `POST /v1/resolutions/{id}/retry`.

### FR-3: Review workflow

- FR-3.1 `GET /v1/articles?status=&topic=` — paginated list of articles.
- FR-3.2 `GET /v1/articles/{id}` — full article detail including source resolution
  and transcript excerpt.
- FR-3.3 `PATCH /v1/articles/{id}` — body: `{ title?, body?, status? }`. Status
  transitions allowed: `pending_review -> approved`, `pending_review -> rejected`,
  `approved -> published` (published sets `published_at`). Any other transition is a
  400.
- FR-3.4 Rejected articles are retained (not deleted) for audit history.

### FR-4: Knowledge retrieval for Agent Runtime

- FR-4.1 `GET /v1/articles/published?topic=` — returns published articles for the
  Agent Runtime to pull in as a citable knowledge source. Expert Answers does not push
  to the Agent Runtime; the Runtime pulls, consistent with the platform's "no
  cross-product imports, HTTP only" rule.
- FR-4.2 Each published article response includes `source_conversation_id` and
  `published_at` so citations can be traced back to their origin.

### FR-5: Auth

- FR-5.1 All endpoints require `X-API-Key` (same pattern as ADP/Channels/Agent
  Runtime). No separate per-resource key — Expert Answers has no anonymous/public
  surface like Channels' widget.

---

## 6. Technical Architecture

```
Care rep / API caller
  │  POST /v1/resolutions
  ▼
Expert Answers Service  (FastAPI, port 8600)
  ├─ Resolution + article store (SQLite)
  ├─ → ADP (port 8100)            ← fetch transcript by adp_session_id
  └─ → Agent Runtime (port 8001)  ← draft generation

Agent Runtime
  └─ → Expert Answers (port 8600) ← GET /v1/articles/published (pulled as a
                                     knowledge source at query time)
```

Expert Answers owns no LLM logic beyond calling the Agent Runtime for drafting; it is
a resolution-capture, review, and publishing service, mirroring how Channels is a
routing/persistence layer rather than an intelligence layer.

---

## 7. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language / framework | Python 3.11 + FastAPI | Same as Agent Runtime, ADP, Channels |
| Database | SQLite (stdlib `sqlite3`) | Same pattern as sibling products |
| HTTP client (outbound) | `httpx` (sync) | Calling ADP and Agent Runtime |
| Testing | pytest + respx | Mocks ADP/Agent Runtime HTTP calls |
| Lint | ruff | Same as sibling products |

---

## 8. Data Models

### SQL schema (`expert-answers/migrations/001_initial_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS resolutions (
    resolution_id     TEXT PRIMARY KEY,
    conversation_id    TEXT NOT NULL,
    adp_session_id     TEXT,
    transcript_json     TEXT NOT NULL,   -- JSON array of {role, content}
    resolution_note     TEXT NOT NULL,
    topic               TEXT,
    status              TEXT NOT NULL DEFAULT 'pending_draft'
                          CHECK(status IN ('pending_draft','draft_failed','drafted')),
    created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_articles (
    article_id       TEXT PRIMARY KEY,
    resolution_id     TEXT NOT NULL REFERENCES resolutions(resolution_id),
    title             TEXT NOT NULL,
    body              TEXT NOT NULL,
    cited_excerpt      TEXT NOT NULL,
    topic             TEXT,
    status            TEXT NOT NULL DEFAULT 'pending_review'
                        CHECK(status IN ('pending_review','approved','rejected','published')),
    published_at       TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON knowledge_articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_topic  ON knowledge_articles(topic);
CREATE INDEX IF NOT EXISTS idx_resolutions_topic ON resolutions(topic);
```

### Pydantic models

```python
class ResolutionCreate(BaseModel):
    conversation_id: str
    transcript: list[dict] | None = None
    adp_session_id: str | None = None
    resolution_note: str
    topic: str | None = None

class ArticleUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    status: Literal["approved", "rejected", "published"] | None = None

class ArticleResponse(BaseModel):
    article_id: str
    resolution_id: str
    title: str
    body: str
    cited_excerpt: str
    topic: str | None
    status: str
    source_conversation_id: str
    published_at: str | None
    created_at: str
    updated_at: str
```

---

## 9. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/resolutions` | X-API-Key | Submit a resolution, triggers draft generation |
| `POST` | `/v1/resolutions/{id}/retry` | X-API-Key | Retry a failed draft |
| `GET` | `/v1/articles` | X-API-Key | List articles (filter by status, topic) |
| `GET` | `/v1/articles/{id}` | X-API-Key | Get article detail |
| `PATCH` | `/v1/articles/{id}` | X-API-Key | Edit / change status |
| `GET` | `/v1/articles/published` | X-API-Key | Published articles for Agent Runtime to pull |
| `GET` | `/v1/health` | X-API-Key | Health check |

All errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`
All list responses: `{ "items": [...], "next_cursor": "..." }`

---

## 10. Repo Structure

```
expert-answers/
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   └── expert_answers/
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       ├── auth.py
│       ├── errors.py
│       ├── main.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── resolution.py
│       │   └── article.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── system.py
│       │   ├── resolutions.py
│       │   └── articles.py
│       └── services/
│           ├── __init__.py
│           ├── resolution_service.py
│           ├── draft_service.py
│           └── article_service.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_resolutions.py
│   ├── test_articles.py
│   ├── test_draft_service.py
│   └── test_integration.py
├── data/
│   └── .gitkeep
├── pyproject.toml
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## 11. Milestones

### M1: Scaffold + DB + Health

Directory layout, `pyproject.toml`, `requirements.txt`, migrations, `config.py`,
`database.py`, `auth.py`, `errors.py`, `main.py`, `routes/system.py`.

**Done when:** `GET /v1/health` returns `{"status":"ok","database":"connected"}`. Auth
tests pass. `pytest` + `ruff check` clean.

### M2: Resolution ingestion

`models/resolution.py`, `services/resolution_service.py`, `routes/resolutions.py`.
ADP fetch mocked in tests via `respx`.

**Done when:** `POST /v1/resolutions` accepts either `transcript` or `adp_session_id`
(exactly one required, 400 otherwise), creates a `pending_draft` record. `pytest` clean.

### M3: Draft generation (mocked Agent Runtime)

`services/draft_service.py`. Agent Runtime call mocked via `respx`.

**Done when:** Submitting a resolution produces a `knowledge_article` with status
`pending_review`. Runtime failure sets resolution to `draft_failed`; retry endpoint
re-attempts. `pytest` clean.

### M4: Review workflow

`models/article.py`, `services/article_service.py`, `routes/articles.py`.

**Done when:** List/get/patch articles work; only valid status transitions succeed
(invalid transition → 400); `published_at` set on publish. `pytest` clean.

### M5: Published articles endpoint + integration test

`GET /v1/articles/published`; `tests/test_integration.py` covering the full lifecycle:
submit resolution → draft created → approve → publish → appears in `/published`.

**Done when:** Full lifecycle passes in one `pytest` run. `ruff check` clean.

---

## 12. Acceptance Criteria (v1 overall)

1. `uvicorn expert_answers.main:app` starts, creates DB, runs migrations automatically.
2. A resolution can be submitted by transcript or by ADP session reference.
3. A draft article is generated and stored as `pending_review` (mocked Agent Runtime
   in tests; real integration requires Agent Runtime + ADP running).
4. Articles can be listed, filtered, edited, approved, rejected, and published.
5. `GET /v1/articles/published` returns only published articles, each traceable to its
   source conversation.
6. All errors follow `{ "error": { "code": "...", "message": "...", "details": {} } }`.
7. All endpoints require `X-API-Key`.
8. Full integration test passes in a single `pytest` run.
9. `pytest` and `ruff check` pass with zero errors.

---

## 13. Performance & Cost Budgets

| Metric | Budget | Rationale |
|---|---|---|
| Resolution ingestion (excluding draft call) | < 30ms | SQLite write |
| Draft generation (p95, excluding LLM latency) | < 20ms orchestration overhead | LLM call dominates; same budget philosophy as Channels |
| Article CRUD (p99) | < 30ms | SQLite reads/writes |

---

## 14. Consistency Check (against DEVELOPMENT-PLAYBOOK Part 3)

| Convention | Expert Answers compliance |
|---|---|
| Error shape `{"error":{"code":"...","message":"...","details":{}}}` | Shared `error_response()` helper |
| REST versioning `/v1/...` | All routes prefixed `/v1` |
| Auth header `X-API-Key` | Yes, all endpoints |
| Python / FastAPI backend | Yes |
| SQLite for local storage | Yes, `expert-answers/data/expert_answers.db` |
| List responses `{"items":[...],"next_cursor":"..."}` | Yes |
| No cross-product imports, HTTP only | Yes — ADP and Agent Runtime called over HTTP |

---

## 15. Environment / Config

| Variable | Required | Default | Description |
|---|---|---|---|
| `EXPERT_ANSWERS_API_KEY` | Yes | `change-me` | Admin API key |
| `EXPERT_ANSWERS_DB_PATH` | No | `data/expert_answers.db` | SQLite path |
| `EXPERT_ANSWERS_PORT` | No | `8600` | Uvicorn port |
| `EXPERT_ANSWERS_ADP_URL` | No | `http://localhost:8100` | ADP base URL |
| `EXPERT_ANSWERS_ADP_API_KEY` | Yes | — | Key to authenticate with ADP |
| `EXPERT_ANSWERS_RUNTIME_URL` | No | `http://localhost:8001` | Agent Runtime base URL |
| `EXPERT_ANSWERS_RUNTIME_API_KEY` | Yes | — | Key to authenticate with Agent Runtime |

---

## 16. Open Questions

- OQ-1: Should similar-resolution matching use embeddings instead of exact-topic-match
  in a future version? Deferred — v1 keeps it simple since no vector store dependency
  exists yet in this product.
- OQ-2: Should there be a webhook/callback when Channels eventually gets human handoff
  routing, so resolutions auto-submit? Deferred until Channels builds that pipeline.
- OQ-3: Should rejected articles be resubmittable for a fresh draft? v1: no — a
  rejected article is terminal; a new resolution must be submitted to try again.
