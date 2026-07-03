# Product Spec: Insights (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1

---

## 1. Problem Statement

Explorer lets an operator inspect one conversation at a time — a debugging and
support tool. Nobody can answer the questions a stakeholder actually asks in a
weekly review: "Is volume going up or down?" "Which agent or channel drives the
most traffic?" "Is confidence trending better or worse than last week?" "Are we
deflecting more conversations than a month ago?" Those questions require comparing
periods and rolling up across agents and channels — data that is either not stored
anywhere yet (there is no historical snapshot once "now" becomes "last week") or is
scattered across ADP, Channels, and Agent Studio with no single place that joins
them. Insights is that place: a trend-reporting layer over the platform's live data.

---

## 2. Goals (v1)

- G1: Show volume trends (sessions, messages) over time, compared period-over-period
  (this week vs last week, this month vs last month).
- G2: Break down volume and quality metrics by agent and by channel, so an operator
  can see which agent/channel combination is driving traffic or trouble.
- G3: Track quality trend lines over time — average confidence score and guardrail
  pass rate — not just a current-window snapshot (that's Explorer's job).
- G4: Surface a deflection-rate estimate (conversations that did not require
  escalation, per Trust & Reliability's escalation signal) as a trend line.
- G5: Provide the same data as a REST API so it can be pulled into an external
  reporting tool later, not just viewed in Insights' own dashboard.

---

## 3. Non-Goals (explicitly out of scope for v1)

- No per-conversation drill-down or transcript viewing — that is Explorer's job;
  Insights links out to Explorer for any single-conversation detail.
- No live/real-time updates — rollups run on a fixed schedule (or manual trigger),
  dashboard reflects the latest completed rollup, not the current second.
- No keyword search across conversations — Explorer owns that.
- No alerting or threshold-based notifications (e.g. "notify me if confidence drops
  below X") — v1 is read-only reporting.
- No custom/arbitrary date range queries — a fixed set of comparison windows only
  (day/week/month), each compared to the immediately preceding equivalent window.
- No data export (CSV/PDF) in v1 — the REST API is the integration point.

---

## 4. Users

**Primary — the stakeholder / operator running a review:** a support manager or
founder checking platform health week over week. Wants a small number of trend
lines and comparisons, not a raw data dump. Not expected to write queries.

**Secondary — another product or script:** pulls Insights' REST API to feed an
external BI tool or a scheduled report. Never touches the dashboard UI.

---

## 5. Functional Requirements

### FR-1: Rollup engine

- FR-1.1 A rollup computes, for a given day, per agent_id and per channel_id:
  `session_count`, `message_count`, `avg_confidence_score`, `guardrail_pass_rate`,
  `escalation_count` (from Trust & Reliability's audit log), `deflection_rate`
  (`1 - escalation_count / session_count`).
- FR-1.2 `POST /v1/rollups/run` triggers a rollup for "yesterday" (or an explicit
  `date` param) — idempotent; re-running the same date overwrites that date's row
  rather than duplicating it.
- FR-1.3 v1 rollups are triggered manually (via the endpoint above) or by a simple
  cron-like scheduler process running `run` once daily — no distributed job queue.
- FR-1.4 If an upstream service (ADP, Channels, Trust) is unreachable during a
  rollup, the rollup fails atomically for that date (no partial row written) and
  returns 502 with `{ "error": { "code": "upstream_error", ... } }`.

### FR-2: Trend queries

- FR-2.1 `GET /v1/trends/volume?window=week` — returns daily session/message counts
  for the current window and the immediately preceding equivalent window, plus a
  computed percent change.
- FR-2.2 `GET /v1/trends/quality?window=week` — same shape, for
  `avg_confidence_score` and `guardrail_pass_rate`.
- FR-2.3 `GET /v1/trends/deflection?window=week` — same shape, for `deflection_rate`.
- FR-2.4 `window` accepts `day`, `week`, `month`. Each compares the window to the
  immediately preceding one of equal length (this week vs last week, etc).
- FR-2.5 All trend responses share one envelope:
  `{ window, current: {...}, previous: {...}, percent_change: {...} }`.

### FR-3: Breakdowns

- FR-3.1 `GET /v1/breakdowns/agents?window=week` — per-agent totals for the window,
  sorted by `session_count` descending, each row: `agent_id, session_count,
  message_count, avg_confidence_score, guardrail_pass_rate`.
- FR-3.2 `GET /v1/breakdowns/channels?window=week` — same shape, keyed by
  `channel_id`, plus `channel_type` (widget/api, from Channels).
- FR-3.3 Agent names and channel names are resolved for display by calling Agent
  Studio and Channels respectively at query time (not stored redundantly in
  rollups) — rollups store IDs only.

### FR-4: Dashboard UI

- FR-4.1 Landing page shows: a volume trend chart (sessions per day, current vs
  previous window overlaid), the three headline percent-change numbers (volume,
  avg confidence, deflection rate), and a ranked table of top agents/channels by
  volume.
- FR-4.2 A window selector (day/week/month) re-fetches all trend queries.
- FR-4.3 Each row in the agent/channel breakdown table links out to Explorer,
  scoped to that agent or channel, for anyone who wants to drill into individual
  conversations — Insights does not duplicate that view.
- FR-4.4 Empty state (no rollups yet) explains that a rollup must run first, with
  a "Run rollup now" button that calls FR-1.2 for yesterday.
- FR-4.5 Percent-change numbers are color-coded (green = improving, red =
  regressing) with the direction that counts as "improving" defined per metric
  (higher confidence/deflection is good; for guardrail pass rate, higher is good).

### FR-5: Auth

- FR-5.1 All API endpoints require `X-API-Key`.
- FR-5.2 UI pages served without auth (local dev only), consistent with Explorer
  and Trust.
- FR-5.3 Insights calls ADP, Channels, Trust, and Agent Studio each with their own
  configured API key.

---

## 6. Technical Architecture

```
Insights UI (Next.js, port 8601)
  │  fetch
  ▼
Insights Service (FastAPI, port 8600)
  ├─ Rollup store (SQLite)              ← daily snapshots, the only new data store
  ├─ → ADP (port 8100)                  ← session/message counts, confidence metadata
  ├─ → Channels (port 8200)             ← channel list, channel_id -> type
  ├─ → Trust & Reliability (port 8500)  ← audit log, escalation counts
  └─ → Agent Studio (Next.js app)       ← agent_id -> name resolution
```

Insights is the one product in the platform that **owns a genuine historical
store** — everything upstream (ADP, Explorer) is live-query-only and has no notion
of "what was true last week" once the window has moved on. The rollup table is
intentionally small and derived (can be deleted and recomputed from upstream data,
as long as Trust's audit log and ADP's messages for that period still exist) — it
is a cache of trend history, not a new source of truth.

### Why a rollup table instead of live period-over-period queries

Computing "this week vs last week" live would mean querying ADP/Trust twice per
request (current + comparison window) and re-aggregating every time — acceptable
at v1's Explorer-scale (no DB, always live) but wrong once real historical
comparison is the whole point of the product: rollups make trend queries O(1)
reads instead of O(n) aggregation across raw messages, and they let history persist
even if upstream services later delete old raw data (e.g. a message-retention
policy in ADP), which live queries could never do.

### Cross-referencing agent/channel identity

Rollups key on `agent_id` (from Agent Studio) and `channel_id` (from Channels) —
the same IDs Channels already uses. This mirrors Channels' existing pattern of
storing `agent_id` on its own channel record rather than inventing a new join
table; Insights just aggregates by the same two IDs everything else already uses.

---

## 7. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language / framework (service) | Python 3.11 + FastAPI | Same as ADP, Channels, Trust |
| Language / framework (UI) | Next.js 14 (App Router) + TypeScript | Same as Explorer, Ghostwriter, Studio |
| Database | SQLite (stdlib `sqlite3`) | One small rollups table; same pattern as ADP/Channels |
| HTTP client (outbound) | `httpx` (sync) | Calling ADP, Channels, Trust, Studio |
| Charts | Recharts | Consistent with Explorer's charting choice |
| UI styling | Tailwind CSS | Consistent with Studio/Ghostwriter/Explorer |
| Testing (service) | pytest + respx | Standard for FastAPI, mocks upstream calls |
| Testing (UI) | Vitest | Same as rest of Next.js products |
| Lint | ruff (service), next lint + tsc (UI) | Consistent |

---

## 8. Data Models

### SQL schema (`insights/migrations/001_initial_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS daily_rollups (
    rollup_date          TEXT NOT NULL,   -- YYYY-MM-DD
    agent_id             TEXT NOT NULL,
    channel_id           TEXT NOT NULL,
    session_count        INTEGER NOT NULL DEFAULT 0,
    message_count        INTEGER NOT NULL DEFAULT 0,
    avg_confidence_score REAL,
    guardrail_pass_rate  REAL,
    escalation_count     INTEGER NOT NULL DEFAULT 0,
    deflection_rate      REAL,
    computed_at          TEXT NOT NULL,
    PRIMARY KEY (rollup_date, agent_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_rollups_date ON daily_rollups(rollup_date);
```

### Pydantic models

```python
class RollupRunRequest(BaseModel):
    date: str | None = None  # defaults to yesterday (UTC)

class TrendPoint(BaseModel):
    date: str
    value: float

class TrendResponse(BaseModel):
    window: Literal["day", "week", "month"]
    current: list[TrendPoint]
    previous: list[TrendPoint]
    percent_change: float | None  # null if previous window has no data

class AgentBreakdownRow(BaseModel):
    agent_id: str
    agent_name: str | None
    session_count: int
    message_count: int
    avg_confidence_score: float | None
    guardrail_pass_rate: float | None

class ChannelBreakdownRow(BaseModel):
    channel_id: str
    channel_type: str | None
    session_count: int
    message_count: int
    avg_confidence_score: float | None
    guardrail_pass_rate: float | None
```

---

## 9. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/rollups/run` | X-API-Key | Compute/overwrite rollup for a date (default: yesterday) |
| `GET` | `/v1/trends/volume` | X-API-Key | Session/message trend (`?window=week`) |
| `GET` | `/v1/trends/quality` | X-API-Key | Confidence/guardrail trend (`?window=week`) |
| `GET` | `/v1/trends/deflection` | X-API-Key | Deflection-rate trend (`?window=week`) |
| `GET` | `/v1/breakdowns/agents` | X-API-Key | Per-agent totals (`?window=week`) |
| `GET` | `/v1/breakdowns/channels` | X-API-Key | Per-channel totals (`?window=week`) |
| `GET` | `/v1/health` | X-API-Key | Health check |
| `GET` | `/v1/stats` | X-API-Key | System-level stats (row count, last rollup date) |

All errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`
All list responses: `{ "items": [...], "next_cursor": "..." }`

---

## 10. Repo Structure

```
insights/
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   └── insights/
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       ├── auth.py
│       ├── errors.py
│       ├── main.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── rollup.py
│       │   └── trend.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── system.py
│       │   ├── rollups.py
│       │   ├── trends.py
│       │   └── breakdowns.py
│       └── services/
│           ├── __init__.py
│           ├── rollup_service.py
│           ├── trend_service.py
│           └── upstream_clients.py   -- ADP/Channels/Trust/Studio HTTP clients
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_rollups.py
│   ├── test_trends.py
│   ├── test_breakdowns.py
│   └── test_integration.py
├── data/
│   └── .gitkeep
├── pyproject.toml
├── requirements.txt
├── .env.example
└── .gitignore

insights-ui/
├── app/
│   ├── page.tsx                -- dashboard
│   └── api/                    -- thin proxy routes to the FastAPI service (adds X-API-Key server-side)
├── components/
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 11. Milestones

### M1: Scaffold + DB + Health

Create directory layout, `pyproject.toml`, `requirements.txt`, migration,
`config.py`, `database.py`, `auth.py`, `errors.py`, `main.py`, `routes/system.py`.

**Done when:** `GET /v1/health` returns `{"status":"ok","database":"connected"}`.
Auth tests pass (missing key → 401, wrong key → 401, correct key → 200). `pytest`
+ `ruff check` clean.

### M2: Rollup engine (mocked upstreams)

`models/rollup.py`, `services/upstream_clients.py`, `services/rollup_service.py`,
`routes/rollups.py`. Upstream calls to ADP/Channels/Trust mocked via `respx`.

**Done when:** `POST /v1/rollups/run` computes and stores one row per
agent_id/channel_id pair seen that day. Re-running the same date overwrites
rather than duplicates (verify row count unchanged). Upstream failure returns 502
with no partial row written. `pytest` clean.

### M3: Trend queries

`models/trend.py`, `services/trend_service.py`, `routes/trends.py`.

**Done when:** `/v1/trends/volume`, `/v1/trends/quality`, `/v1/trends/deflection`
all return `{ window, current, previous, percent_change }` computed from stored
rollups (fixture rollups inserted directly in test setup, no live upstream calls
needed at this stage). `percent_change` is `null` when the previous window has zero
rows. `pytest` clean.

### M4: Breakdowns

`routes/breakdowns.py`, extend `trend_service.py` (or new module) for per-
agent/channel aggregation, including name resolution calls to Studio/Channels
(mocked in tests).

**Done when:** `/v1/breakdowns/agents` and `/v1/breakdowns/channels` return rows
sorted by `session_count` descending, matching fixture rollup data. `pytest` clean.

### M5: Dashboard UI

`insights-ui/` Next.js app: landing page with volume chart, headline percent-
change numbers, breakdown table, window selector, empty state with "Run rollup
now" button.

**Done when:** page renders against a running Insights service with seeded rollup
data; empty state renders correctly against a service with zero rollups; window
selector switches between day/week/month and re-fetches. `npm run build` +
`tsc --noEmit` clean.

### M6: Integration test

`tests/test_integration.py` (service) — full lifecycle: run rollup for two
consecutive dates → query volume trend → verify percent_change is computed
correctly from the two fixture dates → query agent breakdown → verify sort order.

**Done when:** all steps pass in a single `pytest` run. `ruff check` clean.

---

## 12. Acceptance Criteria (v1 overall)

1. `uvicorn insights.main:app` starts, creates DB, runs migrations automatically.
2. `POST /v1/rollups/run` computes a rollup for a given date from live (or mocked,
   in tests) ADP/Channels/Trust data, keyed by agent_id + channel_id.
3. Re-running a rollup for the same date overwrites rather than duplicates.
4. Trend endpoints return current vs previous window with a computed percent
   change, `null` when there is no prior data.
5. Breakdown endpoints return per-agent and per-channel totals sorted by volume.
6. The dashboard UI shows a volume chart, headline percent-change numbers, and a
   breakdown table, with links out to Explorer for per-conversation detail.
7. Empty state (no rollups) is handled explicitly, not a blank or broken page.
8. All errors follow `{ "error": { "code": "...", "message": "...", "details": {} } }`.
9. All API endpoints require `X-API-Key`.
10. Full integration test passes in a single `pytest` run; `pytest`, `ruff check`,
    `npm run build`, and `tsc --noEmit` all pass with zero errors.

---

## 13. Performance & Cost Budgets

| Metric | Budget | Rationale |
|---|---|---|
| Trend/breakdown query latency (p95) | < 50ms | Reads from the small local rollup table only, no upstream calls |
| Rollup run latency (p95, per date) | < 5s | Bounded by upstream fan-out (ADP + Channels + Trust), not LLM calls |
| LLM calls per rollup | 0 | Insights only aggregates numbers already computed by upstream services |
| Upstream calls per rollup run | ~3 + 1 per distinct agent/channel pair (name resolution) | Bounded by number of active agents/channels, not message volume |

---

## 14. Consistency Check (against DEVELOPMENT-PLAYBOOK Part 3)

| Convention | Insights compliance |
|---|---|
| Error shape `{"error":{"code":"...","message":"...","details":{}}}` | Shared `error_response()` helper in `errors.py`, mirrors ADP/Channels/Trust |
| REST versioning `/v1/...` | All routes prefixed `/v1` |
| Auth header `X-API-Key` | Yes, for all endpoints (no separate per-caller key needed — Insights has no untrusted inbound surface like Channels' widget) |
| Python / FastAPI backend | Yes, for the service |
| SQLite for local storage | Yes, `insights/data/insights.db` |
| List responses `{"items":[...],"next_cursor":"..."}` | Yes, for any endpoint returning a collection |
| `confidence_score` naming | Reused verbatim from ADP/Agent Runtime's existing field name, not renamed |

---

## 15. Environment / Config

| Variable | Required | Default | Description |
|---|---|---|---|
| `INSIGHTS_API_KEY` | Yes | `change-me` | Admin API key |
| `INSIGHTS_DB_PATH` | No | `data/insights.db` | SQLite path |
| `INSIGHTS_PORT` | No | `8600` | FastAPI port |
| `INSIGHTS_UI_PORT` | No | `8601` | Next.js dashboard port |
| `INSIGHTS_ADP_URL` | No | `http://localhost:8100` | ADP base URL |
| `INSIGHTS_ADP_API_KEY` | Yes | — | Key to authenticate with ADP |
| `INSIGHTS_CHANNELS_URL` | No | `http://localhost:8200` | Channels base URL |
| `INSIGHTS_CHANNELS_API_KEY` | Yes | — | Key to authenticate with Channels |
| `INSIGHTS_TRUST_URL` | No | `http://localhost:8500` | Trust & Reliability base URL |
| `INSIGHTS_TRUST_API_KEY` | Yes | — | Key to authenticate with Trust |

---

## 16. Open Questions

- OQ-1: Should rollups run on a real scheduler (cron, systemd timer) or stay
  manually triggered via `POST /v1/rollups/run` for v1? Leaning toward: manual /
  simple external cron entry for v1 — no in-process scheduler dependency, matches
  the "compressed lean team" model in the playbook.
- OQ-2: Trust & Reliability's audit log is the source for `escalation_count` — but
  Trust's v1 spec doesn't yet define an explicit "this conversation was escalated"
  signal distinct from a blocked message. Needs a one-line addition to Trust's
  audit log schema (an `escalated: bool` flag) before M2 can be implemented for
  real; mocked in tests regardless. Flagging as a cross-product dependency to
  confirm with whoever owns Trust's spec next.
- OQ-3: What happens to old rollup rows — retained forever, or pruned after some
  window? v1: retained forever (SQLite, small row count: one row per
  agent×channel×day). Revisit if this becomes a real storage concern.
- OQ-4: Should Insights resolve agent/channel names live on every breakdown query
  (current design) or cache them alongside the rollup row? v1: live resolution —
  simpler, and names changing shouldn't require a rollup rewrite. Revisit if
  Studio/Channels latency makes breakdown queries too slow at scale.
