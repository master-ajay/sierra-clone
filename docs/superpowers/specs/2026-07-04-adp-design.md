# Product Spec: Agent Data Platform (v1)

## 1. Problem Statement

The Agent Runtime is stateless: every `/v1/query` call is independent. The Agent Studio deferred persistent memory explicitly. This means:

- **No conversation continuity.** A user who asks "What did I ask you yesterday?" gets nothing. The runtime has no memory beyond the current request.
- **No user context.** The agent cannot know that this user prefers concise answers, has already been told the refund policy, or escalated twice last week.
- **No cross-product data layer.** Future products (Insights dashboards, multi-channel routing) have nowhere to read interaction history or user profiles from.

Without a stateful layer beneath the runtime, every agent interaction starts from zero. ADP is that layer.

## 2. Goals (v1)

1. **Persistent conversation memory.** Store and retrieve full conversation histories (messages, metadata, traces) across sessions for a given user, so the runtime can be context-aware.
2. **User and session management.** Maintain user profiles and session records with arbitrary metadata (preferences, tags, notes) that can be injected into the runtime pipeline at query time.
3. **Context injection API.** Provide a single endpoint that the Agent Runtime calls before generation to fetch relevant prior context (recent messages, user profile, session metadata) within a configurable token budget.
4. **Queryable interaction store.** Expose list/search endpoints over conversations and messages so that Agent Studio can render history UI and future products (Insights, Channels) can read interaction data.
5. **Integration with existing products.** Agent Runtime can call ADP as an optional middleware step. Agent Studio can manage users/sessions and browse history through ADP's API. Neither product requires ADP to function — it is additive.

## 3. Non-Goals (explicitly out of scope)

- **Multi-tenancy / multi-agent isolation.** v1 is single-user, single-agent. No org/team model, no per-agent data partitioning.
- **Semantic memory or summarization.** No vector indexing of past conversations, no automatic summarization of long histories. Context injection uses recency, not relevance.
- **Real-time sync / WebSocket push.** All reads are pull-based. No live-updating conversation feeds.
- **GDPR-style data governance.** No retention policies, right-to-erasure workflows, or audit logs beyond basic timestamps.
- **Production hosting or horizontal scaling.** SQLite, single-process, local machine.
- **Authentication / authorization beyond API key.** No user-facing auth, no OAuth, no RBAC.
- **Analytics, dashboards, or aggregations.** That is the Insights product. ADP stores raw data; Insights reads it.
- **Cross-channel routing or channel adapters.** That is the Channels product.
- **Agent Studio UI changes.** ADP exposes APIs. Any Studio UI that consumes them is Studio's scope, not ADP's.

## 4. Users

| User | Interaction |
|---|---|
| **Agent Runtime (programmatic)** | Calls context-injection endpoint before generation. Calls message-persist endpoint after generation. Primary consumer. |
| **Agent Studio (programmatic)** | Calls user/session CRUD and conversation-list endpoints to power future history UI. |
| **Developer (human, local)** | Configures ADP, runs it locally, inspects data via API or direct SQLite access for debugging. |
| **Future products (Insights, Channels)** | Read conversation and user data. ADP's schema is designed with these reads in mind but does not implement their features. |

## 5. Functional Requirements

### FR-1: User Management
- Create, read, update, delete user profiles.
- Each user has: `user_id` (UUID, system-generated), `external_id` (caller-supplied, optional, unique), `display_name`, `metadata` (arbitrary JSON), `created_at`, `updated_at`.
- List users with pagination (cursor-based).

### FR-2: Session Management
- Create, read, update, close sessions.
- Each session belongs to exactly one user.
- Session has: `session_id`, `user_id`, `status` (active | closed), `metadata` (JSON), `started_at`, `updated_at`, `closed_at`.
- List sessions for a user, filterable by status, ordered by recency.

### FR-3: Message Persistence
- Append messages to a session.
- Each message has: `message_id`, `session_id`, `role` (user | assistant | system), `content` (text), `metadata` (JSON — citations, trace, confidence_score, action, escalation_reason), `created_at`.
- Messages are append-only within a session. No edits, no deletes in v1.
- List messages for a session, ordered chronologically, with pagination.

### FR-4: Context Injection
- Single endpoint accepts `user_id` (required) and optional `session_id`, `max_tokens` (default 2048), `include_user_profile` (default true), `include_history` (default true), `max_messages` (default 50).
- Returns a structured context object containing: user profile (if requested), recent messages from the current session (if `session_id` provided), and a summary of prior sessions (session count, last interaction time).
- The returned context is plain data — the runtime decides how to format it into its prompt. ADP does not construct prompts.
- Token counting uses a simple heuristic (chars / 4) in v1. No tiktoken dependency.

### FR-5: Conversation Search
- Search messages across sessions for a given user by substring match on `content`.
- Returns matching messages with session context, paginated.
- This is a simple SQL `LIKE` search, not full-text or semantic search.

### FR-6: Health and Metadata
- `GET /v1/health` returns service status and database connectivity.
- `GET /v1/stats` returns counts: total users, sessions (by status), messages.

## 6. Technical Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│   Agent Studio      │     │   Agent Runtime       │
│   (Next.js)         │     │   (FastAPI)           │
│                     │     │                       │
│  history UI ────────┼──┐  │  pre-generation ──────┼──┐
│  user mgmt ─────────┼──┤  │  post-generation ─────┼──┤
└─────────────────────┘  │  └──────────────────────┘  │
                         │                             │
                    HTTP  │        HTTP                 │
                         ▼                             ▼
                ┌──────────────────────────────────────┐
                │   Agent Data Platform (FastAPI)       │
                │                                      │
                │   /v1/users/*                         │
                │   /v1/sessions/*                      │
                │   /v1/messages/*                      │
                │   /v1/context/*                       │
                │   /v1/search/*                        │
                │                                      │
                │   ┌────────────────────────┐         │
                │   │  SQLite (adp.db)       │         │
                │   │  users, sessions,      │         │
                │   │  messages tables       │         │
                │   └────────────────────────┘         │
                └──────────────────────────────────────┘
```

**Key design decisions:**

- **Separate process, separate database.** ADP runs as its own FastAPI service on a different port (default 8100, runtime is 8000). Its SQLite database (`data/adp.db`) is separate from Studio's `data/studio.db`. This avoids cross-process SQLite locking issues and keeps product boundaries clean.
- **HTTP integration, not library import.** The runtime calls ADP over HTTP, not by importing Python modules. This keeps the runtime stateless and ADP independently deployable.
- **Append-only messages.** Messages are immutable once written. This simplifies consistency and makes the data reliable for future Insights reads.
- **No caching layer.** SQLite is fast enough for single-user local use. No Redis, no in-memory cache.

## 7. Tech Stack

| Component | Technology | Rationale |
|---|---|---|
| API server | Python 3.11+ / FastAPI | Cross-product convention; matches Agent Runtime |
| Database | SQLite via `sqlite3` (stdlib) | Cross-product convention; no external DB for local v1 |
| Schema migrations | Hand-written SQL scripts, applied on startup | Simplest approach for single-user local; no Alembic overhead |
| Data validation | Pydantic v2 | FastAPI standard; strict mode for request/response models |
| HTTP client (for integration tests) | `httpx` | Async-compatible, used by FastAPI's `TestClient` |
| Testing | `pytest` | Matches Agent Runtime conventions |
| Token estimation | Built-in heuristic (len(text) / 4) | No external dependency; good enough for v1 budget enforcement |

## 8. Data Models

### SQLite Schema

```sql
CREATE TABLE users (
    user_id       TEXT PRIMARY KEY,  -- UUID
    external_id   TEXT UNIQUE,       -- caller-supplied, nullable
    display_name  TEXT NOT NULL,
    metadata      TEXT NOT NULL DEFAULT '{}',  -- JSON
    created_at    TEXT NOT NULL,      -- ISO 8601
    updated_at    TEXT NOT NULL       -- ISO 8601
);

CREATE TABLE sessions (
    session_id    TEXT PRIMARY KEY,  -- UUID
    user_id       TEXT NOT NULL REFERENCES users(user_id),
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    metadata      TEXT NOT NULL DEFAULT '{}',  -- JSON
    started_at    TEXT NOT NULL,      -- ISO 8601
    updated_at    TEXT NOT NULL,      -- ISO 8601
    closed_at     TEXT               -- ISO 8601, nullable
);

CREATE TABLE messages (
    message_id    TEXT PRIMARY KEY,  -- UUID
    session_id    TEXT NOT NULL REFERENCES sessions(session_id),
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content       TEXT NOT NULL,
    metadata      TEXT NOT NULL DEFAULT '{}',  -- JSON (citations, trace, confidence_score, etc.)
    created_at    TEXT NOT NULL       -- ISO 8601
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_users_external_id ON users(external_id);
```

### Pydantic Models (representative)

```python
class UserCreate(BaseModel):
    external_id: str | None = None
    display_name: str
    metadata: dict = {}

class UserResponse(BaseModel):
    user_id: str
    external_id: str | None
    display_name: str
    metadata: dict
    created_at: str
    updated_at: str

class MessageCreate(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    metadata: dict = {}  # citations, trace, confidence_score, action, escalation_reason

class ContextRequest(BaseModel):
    user_id: str
    session_id: str | None = None
    max_tokens: int = 2048
    max_messages: int = 50
    include_user_profile: bool = True
    include_history: bool = True

class ContextResponse(BaseModel):
    user: UserResponse | None
    messages: list[MessageResponse]
    session_summary: SessionSummary
    token_estimate: int
```

## 9. API Surface

All endpoints are prefixed with `/v1`. Auth: `X-API-Key` header (validated against `ADP_API_KEY` env var). Error shape: `{"error": {"code": "...", "message": "...", "details": {...}}}`.

### Users

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/users` | Create user |
| `GET` | `/v1/users` | List users (`?cursor=...&limit=20`) |
| `GET` | `/v1/users/{user_id}` | Get user by ID |
| `GET` | `/v1/users/by-external-id/{external_id}` | Get user by external ID |
| `PATCH` | `/v1/users/{user_id}` | Update user (display_name, metadata) |
| `DELETE` | `/v1/users/{user_id}` | Delete user and all associated sessions/messages |

### Sessions

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/users/{user_id}/sessions` | Create session |
| `GET` | `/v1/users/{user_id}/sessions` | List sessions (`?status=active&cursor=...&limit=20`) |
| `GET` | `/v1/sessions/{session_id}` | Get session |
| `PATCH` | `/v1/sessions/{session_id}` | Update session (metadata, status) |
| `POST` | `/v1/sessions/{session_id}/close` | Close session |

### Messages

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/sessions/{session_id}/messages` | Append message |
| `POST` | `/v1/sessions/{session_id}/messages/batch` | Append multiple messages |
| `GET` | `/v1/sessions/{session_id}/messages` | List messages (`?cursor=...&limit=50`, chronological) |

### Context

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/context` | Get injectable context for a user/session |

### Search

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/users/{user_id}/search` | Search messages (`?q=...&cursor=...&limit=20`) |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/health` | Health check |
| `GET` | `/v1/stats` | Aggregate counts |

## 10. Repo Structure

```
agent-data-platform/
├── README.md
├── pyproject.toml
├── requirements.txt
├── .env.example
├── data/
│   └── .gitkeep                  # adp.db created at runtime
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   └── adp/
│       ├── __init__.py
│       ├── main.py               # FastAPI app, startup (run migrations), middleware
│       ├── config.py             # Settings from env vars
│       ├── database.py           # SQLite connection management, migration runner
│       ├── auth.py               # API key validation dependency
│       ├── errors.py             # Error response helpers, exception handlers
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── session.py
│       │   ├── message.py
│       │   └── context.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── user_service.py
│       │   ├── session_service.py
│       │   ├── message_service.py
│       │   ├── context_service.py
│       │   └── search_service.py
│       └── routes/
│           ├── __init__.py
│           ├── users.py
│           ├── sessions.py
│           ├── messages.py
│           ├── context.py
│           ├── search.py
│           └── system.py
└── tests/
    ├── conftest.py               # Fixtures: test DB, test client, API key
    ├── test_users.py
    ├── test_sessions.py
    ├── test_messages.py
    ├── test_context.py
    ├── test_search.py
    ├── test_system.py
    └── test_integration.py
```

## 11. Milestones (with "done when" criteria)

### M1: Project Scaffold + Database Layer
Set up the FastAPI project, SQLite connection management, migration runner, and the schema from Section 8.

**Done when:**
- `pytest` passes with a test that starts the app, runs migrations, and asserts all three tables exist with correct columns.
- `GET /v1/health` returns `{"status": "ok", "database": "connected"}`.
- API key middleware rejects requests without a valid `X-API-Key` header (returns 401 with standard error shape).

### M2: User CRUD
Implement all user endpoints.

**Done when:**
- Tests cover: create user (with and without external_id), get by ID, get by external_id, list with pagination, update metadata, delete cascades sessions/messages.
- Duplicate `external_id` returns 409 with standard error shape.
- Missing user returns 404 with standard error shape.

### M3: Session CRUD
Implement all session endpoints.

**Done when:**
- Tests cover: create session for user, list sessions filtered by status, get session, update metadata, close session (status flips, closed_at set).
- Creating a session for a nonexistent user returns 404.
- Closing an already-closed session returns 409.

### M4: Message Persistence
Implement message append and list endpoints.

**Done when:**
- Tests cover: append single message, batch append (user + assistant pair), list with pagination in chronological order.
- Message metadata round-trips correctly (JSON with `confidence_score`, `trace`, `citations` fields).
- Appending to a closed session returns 409.

### M5: Context Injection
Implement `POST /v1/context`.

**Done when:**
- Tests cover: context with user profile + history, context without history, context with token budget that truncates older messages, context for user with no sessions.
- Token estimate in response is within 10% of `len(concatenated_content) / 4`.
- Messages are returned chronologically, truncated from the oldest when budget exceeded.

### M6: Search + Stats
Implement message search and stats endpoints.

**Done when:**
- Tests cover: search returns matching messages across sessions, search with no results returns empty list, stats returns correct counts.
- Search is case-insensitive.
- Pagination works on search results.

### M7: Integration Test Suite
End-to-end workflow test covering the full lifecycle.

**Done when:**
- Integration test executes: create user → open session → persist messages → fetch context → search → close session → verify stats.
- All tests pass. Ruff clean.

## 12. Acceptance Criteria (v1 overall)

1. A developer can start ADP with `uvicorn adp.main:app` and it creates the database and applies migrations automatically.
2. All CRUD operations on users, sessions, and messages work as specified, verified by passing tests.
3. The context injection endpoint returns a correctly structured, token-budgeted context payload.
4. Message search returns correct substring matches across all of a user's sessions.
5. All error responses follow the standard shape: `{"error": {"code": "...", "message": "...", "details": {...}}}`.
6. All endpoints require a valid API key via `X-API-Key` header; invalid/missing key returns 401.
7. Cascade delete works: deleting a user removes all their sessions and messages.
8. The full lifecycle integration test passes in a single `pytest` run.
9. No test touches the production database; all tests use isolated temporary databases.
10. `pytest` and `ruff check` pass with zero errors.

## 13. Performance & Cost Budgets

| Metric | Budget | Rationale |
|---|---|---|
| Context injection latency (p99) | < 50ms | Single SQLite read; must not block runtime's generation pipeline |
| Message append latency (p99) | < 20ms | Single INSERT; called after every turn |
| User/session list (p99) | < 30ms | Indexed queries with LIMIT |
| Search latency (p99) | < 100ms | SQL LIKE on content column; acceptable for local v1 |
| External API calls | Zero | ADP makes no outbound calls. Pure data layer. |

## 14. Consistency Check (against cross-product conventions)

| Convention | ADP Compliance |
|---|---|
| Error shape `{"error": {"code": "...", "message": "...", "details": {...}}}` | All error responses use this shape via a shared `error_response()` helper |
| REST versioning `/v1/...` | All routes prefixed `/v1` |
| Field names: `confidence_score`, `trace`, `action`, `escalation_reason` | Stored in message `metadata` JSON; ADP does not rename them |
| Auth: `X-API-Key` header | Implemented as a FastAPI dependency; key from `ADP_API_KEY` env var |
| Python / FastAPI backend | Yes |
| SQLite for local storage | Yes, `data/adp.db` — separate from `data/studio.db` |

## 15. Environment / Config

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADP_API_KEY` | Yes | — | API key for authenticating requests |
| `ADP_DB_PATH` | No | `data/adp.db` | Path to SQLite database file |
| `ADP_HOST` | No | `0.0.0.0` | Server bind host |
| `ADP_PORT` | No | `8100` | Server bind port |
| `ADP_LOG_LEVEL` | No | `info` | Logging level |
| `ADP_MAX_CONTEXT_TOKENS` | No | `4096` | Hard ceiling on context injection token budget |
| `ADP_DEFAULT_PAGE_SIZE` | No | `20` | Default pagination limit |

## 16. Open Questions

1. **Message ordering guarantees.** If the runtime persists user and assistant messages in a batch call, is `created_at` ordering sufficient, or should we add an explicit `sequence` integer? (Leaning toward: batch endpoint assigns sequential timestamps with microsecond precision; revisit if ordering bugs emerge.)

2. **Context injection: cross-session history.** v1 fetches messages only from the current session. Should we also include the last N messages from prior sessions? (Leaning toward: not in v1, add in v1.1 if agents feel amnesiac across sessions.)

3. **User deletion semantics.** Cascade delete is simple but destructive. Should we soft-delete instead? (Leaning toward: hard delete in v1. Soft delete adds query complexity for no current consumer.)

4. **Runtime integration: opt-in or automatic.** Should the Agent Runtime call ADP automatically when `ADP_URL` is configured, or should the caller explicitly pass `user_id`/`session_id` in the `/v1/query` body? (Leaning toward: explicit opt-in via request body. The runtime stays stateless by default.)

5. **WAL mode.** Enable SQLite WAL mode from day one as a low-cost safeguard against concurrent writes? (Leaning toward: yes, one line of config, no downside for local use.)
