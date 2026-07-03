# Product Spec: Trust & Reliability (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1

---

## 1. Problem Statement

Every other product in this platform processes user input and generates responses —
but none enforces a consistent safety layer. Agent Runtime has a faithfulness
guardrail, but it only checks citation grounding, not content policy. There is no
PII detection, no rate limiting, no audit log, and no way to know whether a specific
request was checked at all. As agents get deployed to real users through Channels,
the absence of a cross-cutting safety layer is a liability: one bad response, one
leaked email address, or one prompt injection is enough to erode trust in the whole
platform. Trust & Reliability is that layer.

---

## 2. Goals (v1)

- G1: Detect and redact PII (email addresses, phone numbers, credit card numbers) in
  both inbound user messages and outbound agent replies before they are logged or
  returned.
- G2: Detect and block prompt injection attempts in user messages before they reach
  the agent.
- G3: Apply per-channel rate limiting (N requests per minute per channel_key) so a
  single misbehaving client cannot overwhelm the platform.
- G4: Produce a structured audit log of every request processed — what came in, what
  was flagged, what went out — so any incident can be reconstructed.
- G5: Expose a single `POST /v1/check` endpoint that any product can call to run the
  full pipeline (PII + injection detection + rate limit check) on a message before
  processing it.
- G6: Expose a dashboard showing flag rates, rate limit hits, and a recent audit log.

---

## 3. Non-Goals (explicitly out of scope for v1)

- No LLM-based content moderation (toxic / harmful content classification) — pattern
  and heuristic detection only in v1.
- No blocking of outbound responses for content policy (only PII redaction on output).
- No per-user rate limiting — per-channel only.
- No real-time alerting or webhooks on flag events.
- No integration with external compliance systems (SOC 2, GDPR tooling).
- No custom policy rules via UI — policies are configured via env vars only.
- No image or file content scanning — text only.
- No multi-tenant key management.

---

## 4. Users

**Primary — the platform operator:** configures Trust & Reliability via env vars,
reviews the audit log and dashboard to monitor safety signals, investigates flagged
requests.

**Secondary — other platform products (Channels, Agent Runtime):** call the `POST
/v1/check` endpoint inline on every request to get a check result before processing.
These are machine callers, not humans.

---

## 5. Functional Requirements

### FR-1: Check pipeline (`POST /v1/check`)

The single entry point for all safety checks. Called by Channels before passing a
message to Agent Runtime.

Request body:
```json
{
  "message": "string",
  "channel_id": "string",
  "direction": "inbound" | "outbound",
  "context": {}
}
```

Response:
```json
{
  "allowed": true | false,
  "message_clean": "string (PII redacted)",
  "flags": [
    {
      "type": "pii" | "prompt_injection" | "rate_limit",
      "detail": "string",
      "severity": "warn" | "block"
    }
  ],
  "audit_id": "string"
}
```

- `allowed: false` means at least one `"block"`-severity flag was raised. The caller
  must not pass the message to the agent.
- `allowed: true` with non-empty `flags` means warnings only — caller may proceed
  but should use `message_clean` rather than the original.
- `message_clean` always contains the PII-redacted version of the input (or the
  original if no PII found).

### FR-2: PII detection and redaction

- FR-2.1 Detect and redact the following PII types from both inbound and outbound text:
  - Email addresses (regex: RFC 5322 simplified)
  - Phone numbers (E.164 + common US formats)
  - Credit card numbers (Luhn-valid 13–19 digit sequences)
  - US Social Security Numbers (`\d{3}-\d{2}-\d{4}`)
- FR-2.2 Redaction replaces matched text with a typed placeholder:
  `[EMAIL]`, `[PHONE]`, `[CREDIT_CARD]`, `[SSN]`.
- FR-2.3 PII in inbound messages raises a `"warn"` flag (message is cleaned and
  passed through). PII in outbound replies also raises a `"warn"` flag (cleaned
  before returning to the end user).
- FR-2.4 PII detection is purely regex-based — no external API calls, no ML model.

### FR-3: Prompt injection detection

- FR-3.1 Detect prompt injection attempts in inbound user messages using a heuristic
  rule set:
  - Presence of instruction-override patterns:
    `ignore (all )?(previous|above|prior) instructions?`,
    `you are now`, `new (system )?prompt`, `forget everything`,
    `act as (if )?`, `your (new )?instructions? (are|is)`,
    `disregard (your )?(previous|training)`.
  - Suspicious role-injection: message contains `\n(system|assistant):\s`.
  - Excessive instruction density: message > 500 chars with >3 imperative verb phrases
    (tell, ignore, act, pretend, respond, repeat, output).
- FR-3.2 Any match raises a `"block"` flag with `type: "prompt_injection"`. The
  request is rejected; the message is not passed to the agent.
- FR-3.3 False positives are acceptable in v1 — a blocked legitimate message is less
  bad than a bypassed injection. Thresholds are configurable via env vars.

### FR-4: Rate limiting

- FR-4.1 Per-channel, per-minute sliding window. Default: 60 requests/minute.
  Configurable via `TRUST_RATE_LIMIT_RPM`.
- FR-4.2 Rate limit state is stored in-memory (a dict of channel_id → sliding window
  deque). Resets on service restart. Sufficient for v1.
- FR-4.3 Exceeding the limit raises a `"block"` flag with `type: "rate_limit"`.
  `allowed: false`.
- FR-4.4 `GET /v1/rate-limit/{channel_id}` — returns current window count and limit.

### FR-5: Audit log

- FR-5.1 Every call to `POST /v1/check` produces an audit record written to SQLite:
  - `audit_id`, `channel_id`, `direction`, `original_message` (PII in original is
    stored **redacted** — never store raw PII), `flags` (JSON array), `allowed`,
    `created_at`.
- FR-5.2 `GET /v1/audit?limit=50&cursor=...` — paginated, reverse-chronological audit
  log. Returns redacted messages only.
- FR-5.3 `GET /v1/audit/{audit_id}` — single audit record.
- FR-5.4 Audit records are never deleted via API (append-only). Retention cleanup is
  out of scope for v1.

### FR-6: Health + Stats

- FR-6.1 `GET /v1/health` — returns `{"status":"ok","database":"connected"}`.
- FR-6.2 `GET /v1/stats` — returns:
  ```json
  {
    "total_checks": 0,
    "total_blocked": 0,
    "flags_by_type": {"pii": 0, "prompt_injection": 0, "rate_limit": 0},
    "block_rate": 0.0
  }
  ```

### FR-7: Dashboard (Web UI)

- FR-7.1 Metrics page (`/`) — block rate gauge, flags-by-type bar chart, total checks
  count, recent audit log (last 20 entries).
- FR-7.2 Audit log page (`/audit`) — paginated table: timestamp, channel_id,
  direction, flags, allowed/blocked. Click row → detail.
- FR-7.3 Audit detail page (`/audit/{id}`) — full record: redacted message, all flags
  with type/detail/severity, allowed status.
- FR-7.4 Rate limits page (`/rate-limits`) — table of channels with current request
  count vs limit.
- FR-7.5 Nav: "Dashboard", "Audit Log", "Rate Limits", wordmark.

### FR-8: Auth

- FR-8.1 All endpoints (check, audit, stats) require `X-API-Key`.
- FR-8.2 UI pages served without auth (local dev).

---

## 6. Technical Architecture

```
Channels  ──POST /v1/check──▶  Trust & Reliability Service  (FastAPI, port 8500)
                                  ├─ PII scanner (regex, in-process)
                                  ├─ Injection detector (heuristics, in-process)
                                  ├─ Rate limiter (in-memory sliding window)
                                  ├─ Audit log (SQLite)
                                  └─ Dashboard UI (Next.js, same process or separate)
```

All checks are **in-process** (regex + in-memory). No external API calls. This means:
- Zero LLM cost per check.
- Sub-millisecond PII + injection detection.
- No new external dependencies.
- Rate limiter resets on restart (acceptable for v1).

### Integration pattern

Channels calls Trust before calling Agent Runtime:

```
POST /v1/channels/{id}/chat
  1. POST Trust /v1/check { message, channel_id, direction: "inbound" }
     → if allowed: false → return 400 { error: { code: "blocked", ... } }
     → use message_clean for downstream calls
  2. POST ADP /v1/context ...
  3. POST Agent Runtime /query ...
  4. POST Trust /v1/check { message: reply, channel_id, direction: "outbound" }
     → use reply_clean as the actual response returned to user
  5. POST ADP /v1/sessions/{sid}/messages/batch (with clean messages)
  6. Return reply_clean to caller
```

Trust does not call Channels, ADP, or Agent Runtime. It is a pure processing service
with no upstream dependencies.

---

## 7. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language / framework | Python 3.11 + FastAPI | Same as ADP and Channels |
| Database | SQLite (stdlib `sqlite3`) | Audit log; same pattern as ADP |
| Rate limit state | In-memory (`dict` + `collections.deque`) | Sufficient for v1; no Redis dep |
| PII detection | Pure Python regex | Zero deps; deterministic; fast |
| Injection detection | Pure Python regex | Same |
| Dashboard UI | Separate Next.js app in `trust/ui/` | Same pattern as Explorer |
| Testing | pytest | Consistent |
| Lint | ruff | Consistent |

**Why not one Next.js app?**
The check endpoint is a high-frequency, low-latency API — FastAPI is the right choice
(consistent with ADP and Channels). The dashboard is a low-frequency read UI. Keeping
them in separate processes avoids a Node.js server on the hot path. The FastAPI
service serves the API; the Next.js app calls the API. Same split as Channels and
ADP have with Explorer.

---

## 8. Data Models

### SQL schema (`trust/migrations/001_initial_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id         TEXT PRIMARY KEY,
    channel_id       TEXT NOT NULL,
    direction        TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
    message_clean    TEXT NOT NULL,   -- PII already redacted; never store raw PII
    flags            TEXT NOT NULL,   -- JSON array
    allowed          INTEGER NOT NULL, -- 0 or 1
    created_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_channel   ON audit_log(channel_id);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_allowed   ON audit_log(allowed);
```

### Pydantic models

```python
class CheckRequest(BaseModel):
    message: str
    channel_id: str
    direction: Literal["inbound", "outbound"]
    context: dict = {}

class Flag(BaseModel):
    type: Literal["pii", "prompt_injection", "rate_limit"]
    detail: str
    severity: Literal["warn", "block"]

class CheckResponse(BaseModel):
    allowed: bool
    message_clean: str
    flags: list[Flag]
    audit_id: str

class AuditRecord(BaseModel):
    audit_id: str
    channel_id: str
    direction: str
    message_clean: str
    flags: list[Flag]
    allowed: bool
    created_at: str
```

---

## 9. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/check` | X-API-Key | Run full check pipeline |
| `GET` | `/v1/audit` | X-API-Key | Paginated audit log |
| `GET` | `/v1/audit/{id}` | X-API-Key | Single audit record |
| `GET` | `/v1/rate-limit/{channel_id}` | X-API-Key | Current rate limit state |
| `GET` | `/v1/health` | X-API-Key | Health check |
| `GET` | `/v1/stats` | X-API-Key | Aggregate flag counts |

All errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`

---

## 10. Repo Structure

```
trust/
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   └── trust/
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       ├── auth.py
│       ├── errors.py
│       ├── main.py
│       ├── models/
│       │   ├── __init__.py
│       │   └── check.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── system.py
│       │   ├── check.py
│       │   └── audit.py
│       └── services/
│           ├── __init__.py
│           ├── pii.py            ← PII detection + redaction
│           ├── injection.py      ← prompt injection detection
│           ├── rate_limiter.py   ← in-memory sliding window
│           ├── audit_service.py  ← write + query audit log
│           └── check_service.py  ← orchestrates pii + injection + rate limit
├── ui/                           ← Next.js dashboard (separate app)
│   ├── src/app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← dashboard
│   │   ├── audit/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── rate-limits/
│   │       └── page.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_pii.py
│   ├── test_injection.py
│   ├── test_rate_limiter.py
│   ├── test_audit.py
│   ├── test_check.py
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

Directory, `pyproject.toml`, `requirements.txt`, migrations, `config.py`,
`database.py`, `auth.py`, `errors.py`, `main.py`, `routes/system.py`.

**Done when:** `GET /v1/health` returns 200. Auth rejects missing/wrong keys.
`pytest` + `ruff check` clean.

### M2: PII detection + redaction

`services/pii.py`. Pure regex, no external calls.

**Done when:** All four PII types detected and replaced with placeholders.
Overlapping matches handled (e.g., a message with both email and phone).
Tests include: clean message, each PII type alone, multiple PII types in one message,
adversarial casing variations. `pytest` clean.

### M3: Prompt injection detection

`services/injection.py`. Heuristic rule set.

**Done when:** All defined patterns detected. Legitimate messages pass through without
false positives (tested against a set of normal support questions). Thresholds are
env-var configurable. `pytest` clean.

### M4: Rate limiter

`services/rate_limiter.py`. In-memory sliding window.

**Done when:** Requests within limit pass. First request over limit is blocked.
Window slides correctly (old requests expire). Multiple channels tracked
independently. `pytest` clean.

### M5: Check pipeline + Audit log

`services/check_service.py`, `services/audit_service.py`,
`routes/check.py`, `routes/audit.py`.

**Done when:** `POST /v1/check` orchestrates all three checks, writes audit record,
returns correct response shape. `GET /v1/audit` returns paginated records.
Audit never stores raw PII (verified by test: send PII → read audit → confirm
redacted). `pytest` clean.

### M6: Stats endpoint

`GET /v1/stats` reads from audit log, returns aggregate counts and block rate.

**Done when:** Stats correctly reflect data in audit log after a series of checks.
`pytest` clean.

### M7: Dashboard UI (`trust/ui/`)

Next.js app with 4 pages. Calls the FastAPI service endpoints.

UI-specific Definition of Done (Part 8):
- Design plan before build: this is a security/ops tool — trust and clarity over
  decoration. Red/amber/green for block/warn/pass; no animations.
- Screenshot self-review; one element cut.
- Keyboard-accessible.
- Copy: "Blocked", "Flagged", "Passed" — not "Error", "Warning", "OK".

**Done when:** All pages render. Block/warn/pass states visually distinct.
`next lint` + `tsc --noEmit` clean in `trust/ui/`.

### M8: Integration test

`tests/test_integration.py` — full flow: send clean message → allowed → send PII
message → allowed with redaction → send injection → blocked → send over rate limit →
blocked → verify audit log reflects all four.

**Done when:** All steps pass. `pytest` + `ruff check` clean.

---

## 12. Acceptance Criteria (v1 overall)

1. `uvicorn trust.main:app` starts, creates DB, runs migrations.
2. `POST /v1/check` with a clean message returns `{ allowed: true, flags: [] }`.
3. `POST /v1/check` with PII returns `{ allowed: true, flags: [{type:"pii",...}],
   message_clean: "<redacted>" }`.
4. `POST /v1/check` with a prompt injection pattern returns `{ allowed: false,
   flags: [{type:"prompt_injection", severity:"block"}] }`.
5. `POST /v1/check` over rate limit returns `{ allowed: false,
   flags: [{type:"rate_limit", severity:"block"}] }`.
6. Audit log never contains raw PII — verified by test.
7. `GET /v1/audit` returns paginated records in reverse-chronological order.
8. `GET /v1/stats` returns correct aggregate counts from the audit log.
9. All errors follow `{ "error": { "code": "...", "message": "...", "details": {} } }`.
10. Full integration test passes. `pytest` + `ruff check` pass with zero errors.

---

## 13. Performance & Cost Budgets

| Metric | Budget | Rationale |
|---|---|---|
| `/v1/check` latency (p99) | < 5ms | All checks are in-process regex + dict lookup |
| Audit write latency (p99) | < 10ms | Single SQLite INSERT |
| `/v1/audit` read latency (p99) | < 30ms | Indexed query |
| External API calls per check | Zero | All processing is local |
| LLM cost per check | Zero | No LLM calls in Trust |

---

## 14. Consistency Check (against DEVELOPMENT-PLAYBOOK Part 3)

| Convention | Trust compliance |
|---|---|
| Error shape `{"error":{"code":"...","message":"...","details":{}}}` | Shared `error_response()` in `errors.py` |
| REST versioning `/v1/...` | All FastAPI routes prefixed `/v1` |
| Auth header `X-API-Key` | Yes, all routes |
| List responses `{"items":[...],"next_cursor":"..."}` | Yes (audit log) |
| Python / FastAPI backend | Yes (API); Next.js (dashboard UI) |
| SQLite for local storage | Yes, `trust/data/trust.db` |

---

## 15. Environment / Config

| Variable | Required | Default | Description |
|---|---|---|---|
| `TRUST_API_KEY` | Yes | `change-me` | Admin API key |
| `TRUST_DB_PATH` | No | `data/trust.db` | SQLite path |
| `TRUST_PORT` | No | `8500` | FastAPI port |
| `TRUST_RATE_LIMIT_RPM` | No | `60` | Requests per minute per channel |
| `TRUST_INJECTION_BLOCK` | No | `true` | Whether to block (vs warn) on injection |
| `TRUST_UI_PORT` | No | `8501` | Next.js dashboard port |

---

## 16. Open Questions

- OQ-1: Should prompt injection detection be a `"warn"` (log and pass) or `"block"`
  (reject) in v1? Decision: `"block"` — false positives are preferable to bypassed
  injections. Configurable via `TRUST_INJECTION_BLOCK=false` for teams that want
  warn-only mode.
- OQ-2: Should PII in outbound replies block the response or redact-and-pass? v1:
  redact-and-pass with a `"warn"` flag — blocking the response degrades UX too much
  for false positives on edge cases like "your order #4111111111111111 is confirmed."
- OQ-3: Rate limit state resets on restart. For production use, this should be backed
  by Redis or a DB. Deferred to v1.1 — rate limit precision on restart is acceptable
  for local v1.
- OQ-4: Audit log has no retention limit. At 1000 checks/day, this is ~3M records/year.
  Add `TRUST_AUDIT_RETAIN_DAYS` env var in v1.1 with a cleanup job.
- OQ-5: Should Trust & Reliability be optional (Channels works without it) or
  required? v1: optional — Channels checks if `TRUST_URL` is set and skips if not.
  Operators can onboard incrementally.
