# Product Spec: Channels (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1

---

## 1. Problem Statement

Agents built and tested in Agent Studio have no delivery mechanism. A support manager
can create an agent and verify it works in the playground — but there is no way to
expose that agent to end users without writing custom integration code. Channels fills
this gap: it turns a Studio agent into a deployable endpoint that can be embedded in a
website, called from an external system, or connected to Slack.

---

## 2. Goals (v1)

- G1: Let a user deploy any Studio agent to a web chat widget with a single copy-paste
  embed snippet.
- G2: Let external systems call a deployed agent via a simple REST API (no Studio UI
  required at call time).
- G3: Persist every conversation through ADP so session history is available for
  context injection.
- G4: Let the user create multiple channels per agent (e.g., one for the website, one
  for internal tools) and revoke any channel independently.
- G5: Show each channel's status (active / paused / revoked) and a message count so
  the user can see it is receiving traffic.

---

## 3. Non-Goals (explicitly out of scope for v1)

- No Slack, email, or voice integrations — REST + web widget only.
- No custom domain support for the widget (served from localhost/dev URL).
- No per-channel rate limiting or quota enforcement.
- No real-time analytics or conversation dashboards (Explorer owns that).
- No human handoff / escalation routing.
- No multi-agent routing (one channel → one agent only).
- No authentication of the end-user calling the widget (anonymous is fine for v1).

---

## 4. Users

**Primary — the agent builder:** configures Studio agents, creates channels, embeds
the widget, monitors message counts. Technical enough to paste a `<script>` tag or
call a REST endpoint.

**Secondary — the end user:** the human who types into the embedded chat widget or
sends requests to the REST API. Does not interact with the Channels admin UI at all.

---

## 5. Functional Requirements

### FR-1: Channel management

- FR-1.1 Create a channel: `POST /v1/channels` — body: `{ agent_id, name, type }`.
  `type` is `"widget"` or `"api"`. Returns a channel object with a unique
  `channel_id` and a `channel_key` (opaque token used to authenticate inbound
  requests to this channel).
- FR-1.2 List channels: `GET /v1/channels` — paginated, filterable by `agent_id` and
  `status`.
- FR-1.3 Get channel: `GET /v1/channels/{channel_id}`.
- FR-1.4 Update channel: `PATCH /v1/channels/{channel_id}` — name and status only.
  Setting `status: "paused"` stops the channel from accepting new messages without
  deleting it. Setting `status: "active"` re-enables it.
- FR-1.5 Revoke channel: `DELETE /v1/channels/{channel_id}` — hard delete; the
  `channel_key` stops working immediately. Message history is retained in ADP.
- FR-1.6 Channel stats: `GET /v1/channels/{channel_id}/stats` — returns
  `{ total_messages, total_sessions, last_active_at }`.

### FR-2: Inbound conversation (REST API channel)

- FR-2.1 Send message: `POST /v1/channels/{channel_id}/chat` — header:
  `X-Channel-Key: <channel_key>`. Body: `{ message, session_id? }`.
  - If `session_id` is omitted, a new ADP session is opened automatically.
  - The channel service calls ADP to load context, calls the Agent Runtime to
    generate a response, saves both turns to ADP, and returns:
    `{ reply, session_id, citations, trace }`.
- FR-2.2 Paused or revoked channels return 503 with
  `{ "error": { "code": "channel_unavailable", ... } }`.
- FR-2.3 If the Agent Runtime call fails, return 502 with
  `{ "error": { "code": "upstream_error", ... } }`. Never return a blank reply.

### FR-3: Web widget

- FR-3.1 Serve a JavaScript snippet at `GET /v1/channels/{channel_id}/widget.js`.
  The snippet renders a floating chat button and panel in the host page.
- FR-3.2 The widget opens a session on first message (calling FR-2.1) and maintains
  `session_id` in `sessionStorage` so the conversation is continuous within a tab.
- FR-3.3 Widget renders: chat history, typing indicator while awaiting reply,
  citation list (if any), and an error state for network/upstream failures.
- FR-3.4 The widget has no external JS dependencies (no React, no jQuery). Vanilla JS
  + scoped CSS injected into a shadow DOM so it cannot conflict with host page styles.
- FR-3.5 The widget is keyboard-accessible: focus trap within the panel when open,
  all interactive elements reachable by Tab, Enter to send.

### FR-4: Embed snippet

- FR-4.1 The admin UI (or API) surfaces a ready-to-paste embed snippet:
  ```html
  <script src="http://localhost:8200/v1/channels/{channel_id}/widget.js"
          data-channel-key="{channel_key}"></script>
  ```
- FR-4.2 A channel of type `"api"` shows the equivalent curl example instead of a
  snippet.

### FR-5: Auth

- FR-5.1 Admin endpoints (`/v1/channels` management) require `X-API-Key` header
  (same pattern as ADP and Agent Runtime).
- FR-5.2 Inbound chat and widget endpoints require `X-Channel-Key` header (or
  `data-channel-key` attribute on the script tag). This is a per-channel token, not
  the admin key — so embedding the widget in a public page does not expose admin
  credentials.
- FR-5.3 Both keys are stored in the Channels DB; the admin key is read from env.

---

## 6. Technical Architecture

```
Host page
  └─ widget.js (served by Channels)
       │  XHR/fetch
       ▼
Channels Service  (FastAPI, port 8200)
  ├─ Channel store (SQLite)          ← channel configs, keys, stats
  ├─ → ADP (port 8100)               ← context injection, message persistence
  └─ → Agent Runtime (port 8001)     ← generation with citations
```

Channels does **not** contain its own LLM call or retrieval logic. It is a routing +
persistence orchestration layer. The agent's intelligence lives in Agent Runtime; the
conversation memory lives in ADP.

### Request flow (FR-2.1)

```
POST /v1/channels/{id}/chat
  1. Validate channel_key → look up channel → check status (active?)
  2. If no session_id: POST ADP /v1/users/{uid}/sessions → get session_id
     (uid is a synthetic per-channel ADP user, created once at channel creation time)
  3. POST ADP /v1/context { user_id, session_id } → load history + profile
  4. POST Agent Runtime /query { question, context_messages } → get reply + citations
  5. POST ADP /v1/sessions/{sid}/messages/batch → save user + assistant turns
  6. Increment channel stats counter
  7. Return { reply, session_id, citations, trace }
```

### Channel key design

`channel_key` is a 32-byte random token (64 hex chars), generated at channel
creation, stored as plaintext in the channels DB (not hashed — it needs to be
displayable to the admin and is not a user credential). Separate from the admin
`X-API-Key`.

---

## 7. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language / framework | Python 3.11 + FastAPI | Same as Agent Runtime and ADP |
| Database | SQLite (stdlib `sqlite3`) | Same pattern as ADP; no new deps |
| HTTP client (outbound) | `httpx` (sync) | Calling ADP and Agent Runtime |
| Widget JS | Vanilla JS (no bundler) | Served as a single file; no build step |
| Testing | pytest + respx (mock httpx) | Standard for FastAPI; respx mocks HTTP calls |
| Lint | ruff | Same as ADP and Agent Runtime |

---

## 8. Data Models

### SQL schema (`channels/migrations/001_initial_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS channels (
    channel_id   TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    adp_user_id  TEXT NOT NULL,        -- synthetic ADP user created for this channel
    name         TEXT NOT NULL,
    type         TEXT NOT NULL CHECK(type IN ('widget', 'api')),
    status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','revoked')),
    channel_key  TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_stats (
    channel_id       TEXT PRIMARY KEY REFERENCES channels(channel_id) ON DELETE CASCADE,
    total_messages   INTEGER NOT NULL DEFAULT 0,
    total_sessions   INTEGER NOT NULL DEFAULT 0,
    last_active_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_channels_agent_id ON channels(agent_id);
CREATE INDEX IF NOT EXISTS idx_channels_status   ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_key      ON channels(channel_key);
```

### Pydantic models

```python
class ChannelCreate(BaseModel):
    agent_id: str
    name: str
    type: Literal["widget", "api"]

class ChannelUpdate(BaseModel):
    name: str | None = None
    status: Literal["active", "paused"] | None = None

class ChannelResponse(BaseModel):
    channel_id: str
    agent_id: str
    name: str
    type: str
    status: str
    channel_key: str
    created_at: str
    updated_at: str

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    citations: list[str]
    trace: dict
```

---

## 9. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/channels` | X-API-Key | Create channel |
| `GET` | `/v1/channels` | X-API-Key | List channels |
| `GET` | `/v1/channels/{id}` | X-API-Key | Get channel |
| `PATCH` | `/v1/channels/{id}` | X-API-Key | Update name/status |
| `DELETE` | `/v1/channels/{id}` | X-API-Key | Revoke channel |
| `GET` | `/v1/channels/{id}/stats` | X-API-Key | Channel stats |
| `GET` | `/v1/channels/{id}/snippet` | X-API-Key | Embed snippet / curl example |
| `POST` | `/v1/channels/{id}/chat` | X-Channel-Key | Send message, get reply |
| `GET` | `/v1/channels/{id}/widget.js` | X-Channel-Key (data attr) | Serve widget script |
| `GET` | `/v1/health` | X-API-Key | Health check |
| `GET` | `/v1/stats` | X-API-Key | System-level stats |

All errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`
All list responses: `{ "items": [...], "next_cursor": "..." }`

---

## 10. Repo Structure

```
channels/
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   └── channels/
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       ├── auth.py
│       ├── errors.py
│       ├── main.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── channel.py
│       │   └── chat.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── system.py
│       │   ├── channels.py
│       │   ├── chat.py
│       │   └── widget.py
│       └── services/
│           ├── __init__.py
│           ├── channel_service.py
│           ├── chat_service.py
│           └── widget_service.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_channels.py
│   ├── test_chat.py
│   ├── test_widget.py
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

Create directory layout, `pyproject.toml`, `requirements.txt`, migrations, `config.py`,
`database.py`, `auth.py`, `errors.py`, `main.py`, `routes/system.py`.

**Done when:** `GET /v1/health` returns `{"status":"ok","database":"connected"}`.
Auth tests pass (missing key → 401, wrong key → 401, correct key → 200).
`pytest` + `ruff check` clean.

### M2: Channel CRUD

`models/channel.py`, `services/channel_service.py`, `routes/channels.py`.

**Done when:** Create, list, get, update, delete all pass. Channel key is unique and
64 hex chars. Paused channel cannot be deleted (must be revoked). `pytest` clean.

### M3: Chat endpoint (mocked upstreams)

`models/chat.py`, `services/chat_service.py`, `routes/chat.py`.
Upstream calls to ADP and Agent Runtime are made via `httpx` and **mocked in tests**
using `respx`.

**Done when:** `POST /v1/channels/{id}/chat` returns `{ reply, session_id, citations,
trace }`. Paused/revoked channel returns 503. Missing channel_key returns 401.
Upstream failure returns 502. `pytest` clean.

### M4: Channel stats

Update `channel_service.py` to increment stats on each chat call. `GET
/v1/channels/{id}/stats` returns counts.

**Done when:** Stats reflect actual message + session counts after chat calls. `pytest`
clean.

### M5: Widget

`services/widget_service.py`, `routes/widget.py`.
Widget JS generated server-side as a string (no bundler).

**Done when:** `GET /v1/channels/{id}/widget.js` returns valid JS with correct
`Content-Type: application/javascript`. JS includes the channel_id and chat endpoint
URL. `GET /v1/channels/{id}/snippet` returns the embed HTML. `pytest` clean.

### M6: Integration test

`tests/test_integration.py` — full lifecycle: create channel → send messages → verify
stats → pause channel → verify 503 → revoke → verify 404.

**Done when:** All steps pass in a single `pytest` run. `ruff check` clean.

---

## 12. Acceptance Criteria (v1 overall)

1. `uvicorn channels.main:app` starts, creates DB, runs migrations automatically.
2. A channel can be created, listed, updated, and revoked via the admin API.
3. `POST /v1/channels/{id}/chat` with a valid `channel_key` returns a reply from the
   agent (mocked in tests; real integration requires ADP + Agent Runtime running).
4. A paused channel returns 503; a revoked channel key returns 401.
5. Stats correctly count messages and sessions per channel.
6. `GET /v1/channels/{id}/widget.js` returns a self-contained JS file.
7. All errors follow `{ "error": { "code": "...", "message": "...", "details": {} } }`.
8. Admin endpoints require `X-API-Key`; chat/widget endpoints require `X-Channel-Key`.
9. Full integration test passes in a single `pytest` run.
10. `pytest` and `ruff check` pass with zero errors.

---

## 13. Performance & Cost Budgets

| Metric | Budget | Rationale |
|---|---|---|
| `/chat` latency (p95, excluding upstream) | < 20ms | Channels itself is just routing; LLM latency is the Agent Runtime's concern |
| Channel CRUD latency (p99) | < 30ms | SQLite reads/writes |
| `widget.js` response (p99) | < 10ms | Static string, no DB |
| External calls per `/chat` request | 3 (ADP context, Runtime generate, ADP persist) | Fixed; no LLM calls in Channels itself |

---

## 14. Consistency Check (against DEVELOPMENT-PLAYBOOK Part 3)

| Convention | Channels compliance |
|---|---|
| Error shape `{"error":{"code":"...","message":"...","details":{}}}` | Shared `error_response()` helper in `errors.py` |
| REST versioning `/v1/...` | All routes prefixed `/v1` |
| Auth header `X-API-Key` for admin | Yes; per-channel `X-Channel-Key` for inbound |
| Python / FastAPI backend | Yes |
| SQLite for local storage | Yes, `channels/data/channels.db` |
| List responses `{"items":[...],"next_cursor":"..."}` | Yes |

---

## 15. Environment / Config

| Variable | Required | Default | Description |
|---|---|---|---|
| `CHANNELS_API_KEY` | Yes | `change-me` | Admin API key |
| `CHANNELS_DB_PATH` | No | `data/channels.db` | SQLite path |
| `CHANNELS_PORT` | No | `8200` | Uvicorn port |
| `CHANNELS_ADP_URL` | No | `http://localhost:8100` | ADP base URL |
| `CHANNELS_ADP_API_KEY` | Yes | — | Key to authenticate with ADP |
| `CHANNELS_RUNTIME_URL` | No | `http://localhost:8001` | Agent Runtime base URL |

---

## 16. Open Questions

- OQ-1: Should the widget support streaming replies (SSE) for a better UX? Deferred to
  v1.1 — REST round-trip is simpler and sufficient for v1.
- OQ-2: Should `channel_key` be rotatable without changing `channel_id`? Useful for
  security rotation; deferred to v1.1.
- OQ-3: How does the widget know which ADP `user_id` to associate with an anonymous
  end-user? v1: one synthetic ADP user per channel (all widget users share one
  conversation context). v1.1: pass a `user_id` from the host page via a JS API.
- OQ-4: Should deleted channels retain stats? v1: yes — `channel_stats` ON DELETE
  CASCADE means stats are lost with the channel. Acceptable for v1.
