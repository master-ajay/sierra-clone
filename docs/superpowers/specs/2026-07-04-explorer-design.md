# Product Spec: Explorer (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1

---

## 1. Problem Statement

Once agents are deployed through Channels and serving real users, there is no way to
understand what is happening. A support manager cannot answer: "What are users asking
most?" "Where is the agent failing?" "Is the confidence score improving?" "How many
conversations happened this week?" Without visibility into live conversations,
operators are flying blind — they cannot improve agents, catch regressions, or
demonstrate value to stakeholders. Explorer provides that visibility.

---

## 2. Goals (v1)

- G1: Show a dashboard of key metrics — total conversations, messages, average
  confidence score, and guardrail failure rate — over a configurable time window.
- G2: Let an operator browse all conversations (sessions) in reverse-chronological
  order, with enough context to understand what each one was about.
- G3: Let an operator open a full conversation trace — every message turn, citations,
  confidence scores, and guardrail pass/fail — in a readable, inspectable view.
- G4: Let an operator search conversations by keyword across message content.
- G5: Surface the top questions users are asking (most frequent user message patterns)
  so authors know what to write in Ghostwriter.

---

## 3. Non-Goals (explicitly out of scope for v1)

- No real-time streaming updates (dashboard refreshes on page load / manual refresh).
- No custom date range picker — predefined windows only (today, last 7 days, last 30
  days).
- No export (CSV, JSON) of conversations.
- No per-agent or per-channel breakdown in v1 — all sessions in aggregate.
- No alerting or threshold-based notifications.
- No funnel analytics or drop-off analysis.
- No user-level analytics (anonymous end-users not tracked individually).
- No AI-generated summaries of conversation trends.
- No write operations — Explorer is read-only.

---

## 4. Users

**Primary — the operator / support manager:** monitors agent performance day-to-day.
Wants to spot failures fast, understand what users are asking, and share a metrics
screenshot with a stakeholder.

**Secondary — the knowledge author (Ghostwriter user):** checks Explorer's top
questions to know what new articles to write.

---

## 5. Functional Requirements

### FR-1: Dashboard metrics

- FR-1.1 `GET /api/metrics?window=7d` — returns aggregate counts for the selected
  time window: `total_sessions`, `total_messages`, `avg_confidence_score`,
  `guardrail_failure_rate`, `sessions_per_day` (array of `{ date, count }`).
- FR-1.2 Supported windows: `today`, `7d`, `30d`. Default: `7d`.
- FR-1.3 `avg_confidence_score` is computed from the `confidence_score` field in ADP
  message metadata (set by Agent Runtime on assistant turns). Sessions with no scored
  turns are excluded from the average.
- FR-1.4 `guardrail_failure_rate` is the fraction of assistant turns where
  `metadata.guardrail_passed == false`.

### FR-2: Session list

- FR-2.1 `GET /api/sessions?window=7d&cursor=...&limit=20` — paginated list of
  sessions in reverse-chronological order (by `started_at`). Each item includes:
  `session_id`, `started_at`, `message_count`, `first_user_message` (first 120 chars
  of the first user turn), `last_activity` (timestamp of the last message).
- FR-2.2 Filterable by `window` (same options as FR-1.2).

### FR-3: Conversation trace

- FR-3.1 `GET /api/sessions/{session_id}` — full session detail: all messages in
  chronological order, each with `role`, `content`, `metadata` (citations,
  confidence_score, guardrail_passed, action).
- FR-3.2 The trace view makes the explainability data a first-class design element —
  citations, confidence score, and guardrail result are displayed inline with each
  assistant turn, not buried in a JSON expand.

### FR-4: Search

- FR-4.1 `GET /api/search?q=...&window=7d&cursor=...&limit=20` — keyword search
  across message content (delegated to ADP's search endpoint). Returns matching
  messages with `session_id`, `role`, `content` snippet, `created_at`.
- FR-4.2 Case-insensitive. Paginated.

### FR-5: Top questions

- FR-5.1 `GET /api/top-questions?window=7d&limit=20` — returns the most frequently
  occurring user messages, grouped by normalized content (lowercased, punctuation
  stripped). Response: `[{ question, count, example_session_id }]`.
- FR-5.2 "Normalized" means whitespace-collapsed and lowercased. Not NLP clustering —
  exact-string grouping is sufficient for v1.

### FR-6: Web UI

- FR-6.1 Dashboard page (`/`) — metric cards (total sessions, messages, avg
  confidence, guardrail failure rate) + sparkline chart of sessions per day +
  time window selector.
- FR-6.2 Sessions page (`/sessions`) — paginated table: first message, timestamp,
  message count. Click row → conversation trace.
- FR-6.3 Trace page (`/sessions/{id}`) — full conversation with inline metadata.
  Each assistant turn shows citations (linked), confidence score (coloured
  low/medium/high), guardrail badge (passed / failed).
- FR-6.4 Search page (`/search`) — keyword input, results list with session link and
  content snippet.
- FR-6.5 Top questions page (`/top-questions`) — ranked list with count badge.
- FR-6.6 All pages share a nav: "Dashboard", "Sessions", "Search", "Top Questions",
  product wordmark.
- FR-6.7 The trace/explainability data is the signature design element (per
  DEVELOPMENT-PLAYBOOK Part 8): confidence scores and guardrail results are
  color-coded, not raw text — green/amber/red confidence, pass/fail badge.

### FR-7: Auth

- FR-7.1 All API endpoints require `X-API-Key`.
- FR-7.2 UI pages are served without auth (local dev only).
- FR-7.3 Explorer calls ADP with its own `EXPLORER_ADP_API_KEY`.

---

## 6. Technical Architecture

```
Browser
  └─ Explorer UI  (Next.js App Router, port 8400)
       │  fetch
       ▼
Explorer API routes  (Next.js)
  └─ → ADP (port 8100)     ← all data lives here
```

Explorer is **read-only** and has **no database of its own**. All conversation data
lives in ADP. Explorer's API routes are thin adapters that query ADP and reshape
the response for the UI.

This means:
- No data duplication.
- No sync job or ETL pipeline.
- ADP is the single source of truth.
- Explorer can be restarted or wiped with zero data loss.

### Data flow for each feature

| Feature | ADP calls |
|---|---|
| Dashboard metrics | `GET /v1/stats` + custom aggregation over `GET /v1/sessions` messages |
| Session list | `GET /v1/sessions` (all users, ordered by started_at) |
| Conversation trace | `GET /v1/sessions/{id}` + `GET /v1/sessions/{id}/messages` |
| Search | `GET /v1/users/{uid}/search?q=...` across all users |
| Top questions | `GET /v1/sessions/{id}/messages` aggregated across sessions |

**ADP gap note:** ADP v1 scopes sessions and search to a single `user_id`. Explorer
needs cross-user queries. Two options for v1:
1. Explorer keeps a local list of all ADP `user_id`s it has seen (stored in memory /
   a small SQLite table) and fans out parallel ADP calls.
2. ADP adds admin-scoped list-all-sessions and search-all endpoints in a v1.1 patch.

**Decision for v1:** Option 1 — Explorer maintains a lightweight local index of
`user_id`s seen via Channels webhook or by scanning ADP's user list. This is a
minimal SQLite table with one column. Keeps Explorer shipping without blocking on ADP
changes.

---

## 7. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language / framework | Next.js 14 (App Router) + TypeScript | Same as Agent Studio and Ghostwriter |
| Local index | SQLite via `better-sqlite3` | One table; tracks known ADP user_ids |
| HTTP client | `fetch` (Node built-in) | Calling ADP from API routes |
| Charts | Recharts (lightweight, React-native) | Sessions-per-day sparkline; no heavy BI lib |
| UI | Tailwind CSS | Consistent with Studio and Ghostwriter |
| Testing | Vitest | Same as rest of Next.js products |
| Lint | next lint + tsc --noEmit | Consistent |

---

## 8. Data Models

### Local SQLite schema (`explorer/migrations/001_initial_schema.sql`)

```sql
-- Tracks ADP user_ids that Explorer has seen, enabling cross-user queries
CREATE TABLE IF NOT EXISTS known_users (
    user_id     TEXT PRIMARY KEY,
    first_seen  TEXT NOT NULL
);
```

That's the entire local schema. All real data lives in ADP.

### TypeScript types

```typescript
interface MetricsResponse {
  window: string
  total_sessions: number
  total_messages: number
  avg_confidence_score: number | null
  guardrail_failure_rate: number | null
  sessions_per_day: { date: string; count: number }[]
}

interface SessionSummary {
  session_id: string
  started_at: string
  message_count: number
  first_user_message: string
  last_activity: string
}

interface MessageTrace {
  message_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata: {
    citations?: string[]
    confidence_score?: number
    guardrail_passed?: boolean
    action?: string
  }
}

interface TopQuestion {
  question: string
  count: number
  example_session_id: string
}
```

---

## 9. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/metrics` | X-API-Key | Dashboard metrics (`?window=7d`) |
| `GET` | `/api/sessions` | X-API-Key | Paginated session list |
| `GET` | `/api/sessions/{id}` | X-API-Key | Full conversation trace |
| `GET` | `/api/search` | X-API-Key | Cross-session keyword search |
| `GET` | `/api/top-questions` | X-API-Key | Most frequent user messages |
| `GET` | `/api/health` | X-API-Key | Health check |
| `POST` | `/api/users/register` | X-API-Key | Register an ADP user_id with Explorer |

All errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`

---

## 10. Repo Structure

```
explorer/
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx               ← dashboard (/)
│       ├── sessions/
│       │   ├── page.tsx           ← session list
│       │   └── [id]/
│       │       └── page.tsx       ← conversation trace
│       ├── search/
│       │   └── page.tsx
│       ├── top-questions/
│       │   └── page.tsx
│       └── api/
│           ├── health/
│           │   └── route.ts
│           ├── metrics/
│           │   └── route.ts
│           ├── sessions/
│           │   ├── route.ts
│           │   └── [id]/
│           │       └── route.ts
│           ├── search/
│           │   └── route.ts
│           ├── top-questions/
│           │   └── route.ts
│           └── users/
│               └── register/
│                   └── route.ts
├── lib/
│   ├── db.ts           ← known_users table
│   ├── adp.ts          ← ADP client (fetch wrapper)
│   ├── metrics.ts      ← aggregation logic
│   ├── sessions.ts     ← session list + trace
│   ├── search.ts       ← cross-user search fan-out
│   ├── top-questions.ts
│   └── auth.ts
├── components/
│   ├── MetricCard.tsx
│   ├── SparklineChart.tsx
│   ├── SessionTable.tsx
│   ├── TraceMessage.tsx       ← message with inline citations/confidence/guardrail
│   ├── ConfidenceBadge.tsx
│   └── GuardrailBadge.tsx
├── tests/
│   ├── metrics.test.ts
│   ├── sessions.test.ts
│   ├── search.test.ts
│   ├── top-questions.test.ts
│   └── integration.test.ts
├── data/
│   └── .gitkeep
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── .env.local.example
└── .gitignore
```

---

## 11. Milestones

### M1: Scaffold + DB + Health

Directory, `package.json`, migrations, `lib/db.ts`, `lib/auth.ts`, `lib/adp.ts`,
`app/api/health/route.ts`, `app/api/users/register/route.ts`.

**Done when:** `GET /api/health` returns 200. `POST /api/users/register` stores a
user_id in `known_users`. ADP client fetch is mocked in tests.
`npm test` + `next lint` + `tsc --noEmit` clean.

### M2: Metrics + Session list API

`lib/metrics.ts`, `lib/sessions.ts`, `app/api/metrics/route.ts`,
`app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`.

All ADP calls mocked in tests.

**Done when:** Metrics endpoint returns correct aggregates for a mocked dataset.
Session list is paginated and reverse-chronological. Trace endpoint returns all
messages with metadata. `npm test` clean.

### M3: Search + Top questions API

`lib/search.ts`, `lib/top-questions.ts`, `app/api/search/route.ts`,
`app/api/top-questions/route.ts`.

**Done when:** Search fans out across known users and returns de-duplicated, paginated
results. Top questions groups and sorts by frequency. `npm test` clean.

### M4: Web UI

All page components and shared components (`MetricCard`, `SparklineChart`,
`SessionTable`, `TraceMessage`, `ConfidenceBadge`, `GuardrailBadge`).

UI-specific Definition of Done (Part 8) applies:
- Design plan before build: the explainability data (confidence + guardrail) is the
  signature element — design around it, not as an afterthought.
- Color-coded confidence: green (≥0.8), amber (0.5–0.79), red (<0.5).
- Screenshot self-review; one element cut for restraint.
- Keyboard-accessible.
- No lorem ipsum — use realistic agent conversation copy.

**Done when:** All pages render with mocked data. Trace page shows inline
confidence/guardrail badges. `next lint` + `tsc --noEmit` clean.

### M5: Integration test

`tests/integration.test.ts` — register user → mock ADP session data → assert metrics
→ assert session list → assert trace → assert search → assert top questions.

**Done when:** Full lifecycle passes. `npm test` + lint + typecheck clean.

---

## 12. Acceptance Criteria (v1 overall)

1. `npm run dev` starts Explorer; DB created on first request.
2. `GET /api/metrics?window=7d` returns correct aggregates computed from ADP data.
3. `GET /api/sessions` returns reverse-chronological, paginated session summaries.
4. `GET /api/sessions/{id}` returns the full message trace with all metadata fields.
5. `GET /api/search?q=...` returns matching messages across all known users.
6. `GET /api/top-questions` returns the most frequent user messages, ranked by count.
7. The trace UI displays confidence scores and guardrail results as color-coded badges
   inline with each assistant turn.
8. All errors follow `{ "error": { "code": "...", "message": "...", "details": {} } }`.
9. Full integration test passes in a single `npm test` run.
10. `npm test`, `next lint`, and `tsc --noEmit` pass with zero errors.

---

## 13. Performance & Cost Budgets

| Metric | Budget | Rationale |
|---|---|---|
| `/api/metrics` latency (p95) | < 500ms | Fan-out across known users; acceptable for a dashboard refresh |
| `/api/sessions` latency (p95) | < 200ms | Paginated ADP call; single request |
| `/api/sessions/{id}` latency (p95) | < 100ms | Single ADP session + messages fetch |
| `/api/search` latency (p95) | < 600ms | Fan-out; acceptable for a search action |
| ADP calls per metrics request | O(known_users) | Bounded by channel count, not message count |

---

## 14. Consistency Check (against DEVELOPMENT-PLAYBOOK Part 3)

| Convention | Explorer compliance |
|---|---|
| Error shape `{"error":{"code":"...","message":"...","details":{}}}` | Shared `apiError()` in `lib/auth.ts` |
| Auth header `X-API-Key` | Yes, all API routes |
| List responses `{"items":[...],"next_cursor":"..."}` | Yes (sessions, search) |
| SQLite for local storage | Yes, minimal known_users table |
| Tailwind + shared token system | Yes |
| `/api/` prefix (Next.js) | Consistent with Studio and Ghostwriter |

---

## 15. Environment / Config

| Variable | Required | Default | Description |
|---|---|---|---|
| `EXPLORER_API_KEY` | Yes | `change-me` | Admin API key |
| `EXPLORER_DB_PATH` | No | `data/explorer.db` | SQLite path for known_users |
| `EXPLORER_PORT` | No | `8400` | Dev server port |
| `EXPLORER_ADP_URL` | No | `http://localhost:8100` | ADP base URL |
| `EXPLORER_ADP_API_KEY` | Yes | — | Key to authenticate with ADP |

---

## 16. Open Questions

- OQ-1: ADP v1 scopes search and session listing to a single `user_id`. Explorer
  fans out across known users. This is O(N users) ADP calls for cross-user queries.
  For small deployments (one channel = one ADP user) this is fine. For larger
  deployments, ADP v1.1 should add admin-scoped list-all-sessions and search-all
  endpoints. Tracked; not a blocker for Explorer v1.
- OQ-2: `known_users` is populated by Channels calling `POST /api/users/register`
  whenever a new session is created. This coupling is implicit in v1. If Channels is
  not running, Explorer knows no users. Document this dependency clearly.
- OQ-3: The sessions-per-day sparkline requires date bucketing. ADP stores timestamps
  as ISO strings. Bucketing is done in Explorer's `lib/metrics.ts`. Verify timezone
  handling: use UTC throughout; document that all times are UTC.
- OQ-4: Should confidence score thresholds (green/amber/red) be configurable? Deferred
  to v1.1 — hardcoded at 0.8 / 0.5 for v1.
