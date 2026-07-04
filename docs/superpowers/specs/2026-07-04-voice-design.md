# Product Spec: Voice (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1

---

## 1. Problem Statement

Channels only supports web widget and REST chat — there is no phone/voice channel
anywhere in the platform. Sierra's real Voice product handles live telephony:
low-latency speech, interruption handling, background-noise robustness, per-turn model
routing across languages, real-time sentiment detection, escalation to a human rep
with full context, and in-call PCI-compliant payment collection via DTMF. This clone
has no telephony infrastructure, so v1 models a phone call as a turn-based session —
text stands in for the STT/TTS boundary — while keeping the same data model and API
shape a real telephony integration would need, so that piece can be swapped in later
without a redesign.

---

## 2. Goals (v1)

- G1: Let a user create a "line" (a voice-channel equivalent of a Channels channel)
  bound to a Studio agent.
- G2: Accept a turn-based simulated call: each turn is submitted as text (standing in
  for a transcribed utterance) and answered with text (standing in for synthesized
  speech).
- G3: Score sentiment per turn and track a running sentiment trend across the call;
  flag when the trend crosses a negative threshold as escalation-recommended.
- G4: Support escalating a call to a human rep on demand, producing an AI-generated
  summary of the call plus full turn history.
- G5: Support a structured "collect payment info" action within a call, routed through
  the Trust & Reliability guardrail before being recorded — no real payment processor
  is called.
- G6: Persist call sessions and turns through ADP, the same way Channels persists chat
  sessions.

---

## 3. Non-Goals (explicitly out of scope for v1)

- No real telephony/carrier integration (Twilio, SIP trunking, PSTN) — inbound calls
  are simulated via API calls, not real phone numbers.
- No real audio — no STT, no TTS, no audio codecs. Turns are plain text end to end.
- No real payment processor integration — the payment action is recorded as a stub
  (`collected` or `blocked`), never charges anything.
- No multilingual model routing or mid-call language switching — English only.
- No outbound calling.
- No background-noise/interruption/barge-in modeling — that only matters for real
  audio, which is out of scope.

---

## 4. Users

**Primary — agent builder:** creates lines, monitors call stats, reviews escalated
call summaries.

**Secondary — the "caller":** in v1 this is a test harness or API client standing in
for an end user, since there is no real telephony front door. Submits turns and
receives replies exactly as a Channels REST caller would.

---

## 5. Functional Requirements

### FR-1: Line management

- FR-1.1 `POST /v1/lines` — body: `{ agent_id, name }`. Returns a line object with
  `line_id` and `line_key` (opaque per-line token, same pattern as Channels'
  `channel_key`).
- FR-1.2 `GET /v1/lines` — paginated, filterable by `agent_id` and `status`.
- FR-1.3 `GET /v1/lines/{line_id}` — get line detail.
- FR-1.4 `PATCH /v1/lines/{line_id}` — name and status (`active`/`paused`) only.
- FR-1.5 `DELETE /v1/lines/{line_id}` — revoke; `line_key` stops working immediately,
  call history retained in ADP.

### FR-2: Call lifecycle

- FR-2.1 `POST /v1/lines/{line_id}/calls` — header `X-Line-Key`. Opens a new ADP
  session (one synthetic ADP user per line, mirroring Channels' pattern) and a `call`
  record with status `active`. Returns `{ call_id, session_id }`.
- FR-2.2 `POST /v1/calls/{call_id}/end` — sets call status to `completed`, returns a
  final sentiment summary (`{ average_sentiment, trend }`).
- FR-2.3 Paused/revoked line, or an already-ended call, returns 503 with
  `{ "error": { "code": "call_unavailable", ... } }`.

### FR-3: Turn exchange

- FR-3.1 `POST /v1/calls/{call_id}/turns` — header `X-Line-Key`. Body: `{ text }`.
  Loads context from ADP, calls the Agent Runtime for a reply, scores sentiment on the
  caller's turn (simple classifier call — reuses the Agent Runtime's completion
  endpoint with a sentiment-scoring prompt; no separate ML model in v1), saves both
  turns to ADP, updates the call's running sentiment trend.
  Returns `{ reply, sentiment: { label, score }, call_sentiment_trend,
  escalation_recommended }`.
- FR-3.2 `escalation_recommended` is `true` once the trailing 3-turn average sentiment
  score drops below a fixed threshold (`-0.5` on a `-1..1` scale). This is advisory —
  it does not auto-escalate.
- FR-3.3 If the Agent Runtime call fails, return 502 with
  `{ "error": { "code": "upstream_error", ... } }`.

### FR-4: Escalation

- FR-4.1 `POST /v1/calls/{call_id}/escalate` — generates a call summary via the Agent
  Runtime from the full turn history, sets call status to `escalated`. Returns
  `{ summary, turns }`.
- FR-4.2 An escalated call can still receive turns (a human rep may continue the
  conversation through the same API in v1 — no separate human-rep UI is built).

### FR-5: Payment action

- FR-5.1 `POST /v1/calls/{call_id}/payment` — body: `{ masked_card_last4, amount,
  currency }` (never raw card numbers — v1 assumes the field is pre-masked/tokenized
  by the caller, consistent with not building real payment infra).
- FR-5.2 Before recording, the request is checked against the Trust & Reliability
  guardrail service (`POST /v1/guardrails/check` — mocked in tests). If the guardrail
  blocks it, the payment attempt is recorded with status `blocked` and a 403 is
  returned. Otherwise it is recorded as `collected` and 200 is returned. No real charge
  occurs either way.

### FR-6: Auth

- FR-6.1 Admin endpoints (line management, escalation, payment) require `X-API-Key`.
- FR-6.2 Turn exchange and call-open endpoints require `X-Line-Key` (per-line token),
  mirroring Channels' `X-Channel-Key` split between admin and inbound auth.

---

## 6. Technical Architecture

```
Caller (test harness / API client)
  │  X-Line-Key
  ▼
Voice Service  (FastAPI, port 8700)
  ├─ Line/call/turn store (SQLite)
  ├─ → ADP (port 8100)                    ← context, session persistence
  ├─ → Agent Runtime (port 8001)          ← reply generation, sentiment scoring, summary
  └─ → Trust & Reliability (port 8500)    ← guardrail check before recording payment
```

Voice, like Channels, holds no LLM logic of its own — it is a routing, sentiment-
tracking, and persistence layer over the Agent Runtime and ADP, with an added
guardrail hop into Trust & Reliability for the one sensitive action (payment
collection) it exposes.

### Request flow (FR-3.1)

```
POST /v1/calls/{id}/turns
  1. Validate line_key → look up line → check call is active
  2. POST ADP /v1/context { user_id, session_id } → load history
  3. POST Agent Runtime /query { question: text, context_messages } → reply
  4. POST Agent Runtime /query (sentiment-scoring prompt) → { label, score }
  5. POST ADP /v1/sessions/{sid}/messages/batch → save turns
  6. Recompute trailing sentiment trend, set escalation_recommended
  7. Return { reply, sentiment, call_sentiment_trend, escalation_recommended }
```

---

## 7. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language / framework | Python 3.11 + FastAPI | Same as Agent Runtime, ADP, Channels |
| Database | SQLite (stdlib `sqlite3`) | Same pattern as sibling products |
| HTTP client (outbound) | `httpx` (sync) | Calling ADP, Agent Runtime, Trust & Reliability |
| Testing | pytest + respx | Mocks all upstream HTTP calls |
| Lint | ruff | Same as sibling products |

---

## 8. Data Models

### SQL schema (`voice/migrations/001_initial_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS lines (
    line_id      TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    adp_user_id  TEXT NOT NULL,
    name         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','revoked')),
    line_key     TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
    call_id           TEXT PRIMARY KEY,
    line_id           TEXT NOT NULL REFERENCES lines(line_id),
    session_id        TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'active'
                        CHECK(status IN ('active','escalated','completed')),
    sentiment_trend_json TEXT NOT NULL DEFAULT '[]',
    created_at        TEXT NOT NULL,
    ended_at          TEXT
);

CREATE TABLE IF NOT EXISTS payment_attempts (
    payment_id         TEXT PRIMARY KEY,
    call_id            TEXT NOT NULL REFERENCES calls(call_id),
    masked_card_last4  TEXT NOT NULL,
    amount             REAL NOT NULL,
    currency           TEXT NOT NULL,
    status             TEXT NOT NULL CHECK(status IN ('collected','blocked')),
    created_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lines_agent_id ON lines(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_line_id  ON calls(line_id);
```

### Pydantic models

```python
class LineCreate(BaseModel):
    agent_id: str
    name: str

class TurnRequest(BaseModel):
    text: str

class TurnResponse(BaseModel):
    reply: str
    sentiment: dict          # { "label": str, "score": float }
    call_sentiment_trend: list[float]
    escalation_recommended: bool

class PaymentRequest(BaseModel):
    masked_card_last4: str
    amount: float
    currency: str
```

---

## 9. API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/lines` | X-API-Key | Create line |
| `GET` | `/v1/lines` | X-API-Key | List lines |
| `GET` | `/v1/lines/{id}` | X-API-Key | Get line |
| `PATCH` | `/v1/lines/{id}` | X-API-Key | Update name/status |
| `DELETE` | `/v1/lines/{id}` | X-API-Key | Revoke line |
| `POST` | `/v1/lines/{id}/calls` | X-Line-Key | Start call |
| `POST` | `/v1/calls/{id}/turns` | X-Line-Key | Exchange a turn |
| `POST` | `/v1/calls/{id}/end` | X-Line-Key | End call |
| `POST` | `/v1/calls/{id}/escalate` | X-API-Key | Escalate to human, get summary |
| `POST` | `/v1/calls/{id}/payment` | X-API-Key | Collect payment (stub) via guardrail |
| `GET` | `/v1/health` | X-API-Key | Health check |

All errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`
All list responses: `{ "items": [...], "next_cursor": "..." }`

---

## 10. Repo Structure

```
voice/
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   └── voice/
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       ├── auth.py
│       ├── errors.py
│       ├── main.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── line.py
│       │   ├── call.py
│       │   └── payment.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── system.py
│       │   ├── lines.py
│       │   ├── calls.py
│       │   └── payments.py
│       └── services/
│           ├── __init__.py
│           ├── line_service.py
│           ├── call_service.py
│           ├── sentiment_service.py
│           └── payment_service.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_lines.py
│   ├── test_calls.py
│   ├── test_payments.py
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

### M2: Line management

`models/line.py`, `services/line_service.py`, `routes/lines.py`.

**Done when:** Create, list, get, update, revoke all pass. `line_key` unique, 64 hex
chars. `pytest` clean.

### M3: Call + turn exchange (mocked upstreams)

`models/call.py`, `services/call_service.py`, `services/sentiment_service.py`,
`routes/calls.py`. ADP and Agent Runtime calls mocked via `respx`.

**Done when:** `POST /v1/calls/{id}/turns` returns `{ reply, sentiment,
call_sentiment_trend, escalation_recommended }`. Escalation-recommended flips `true`
once trailing 3-turn average drops below `-0.5` in tests. Ended/paused calls return
503. `pytest` clean.

### M4: Escalation

Extend `call_service.py` and `routes/calls.py` with `/escalate`.

**Done when:** Escalating produces a summary (mocked Agent Runtime call) and sets call
status to `escalated`; escalated calls still accept turns. `pytest` clean.

### M5: Payment stub + guardrail integration

`models/payment.py`, `services/payment_service.py`, `routes/payments.py`. Trust &
Reliability guardrail call mocked via `respx`.

**Done when:** Guardrail-approved payment records `collected` (200); guardrail-blocked
payment records `blocked` (403). No real charge logic anywhere. `pytest` clean.

### M6: Integration test

`tests/test_integration.py` — full lifecycle: create line → start call → exchange
turns until escalation-recommended flips → escalate → attempt payment → end call.

**Done when:** All steps pass in a single `pytest` run. `ruff check` clean.

---

## 12. Acceptance Criteria (v1 overall)

1. `uvicorn voice.main:app` starts, creates DB, runs migrations automatically.
2. A line can be created, listed, updated, and revoked via the admin API.
3. A call can be started, exchange turns, and end; sentiment trend and
   escalation-recommended flag update per turn.
4. A call can be escalated on demand, producing a summary and full turn history.
5. A payment attempt is checked against the Trust & Reliability guardrail and recorded
   as `collected` or `blocked` accordingly — never actually charged.
6. Paused/revoked lines and ended calls return 503/401 as appropriate.
7. All errors follow `{ "error": { "code": "...", "message": "...", "details": {} } }`.
8. Admin endpoints require `X-API-Key`; call/turn endpoints require `X-Line-Key`.
9. Full integration test passes in a single `pytest` run.
10. `pytest` and `ruff check` pass with zero errors.

---

## 13. Performance & Cost Budgets

| Metric | Budget | Rationale |
|---|---|---|
| `/turns` latency (p95, excluding upstream LLM calls) | < 25ms | Voice makes two Runtime calls (reply + sentiment) per turn instead of Channels' one; still routing-only overhead |
| Line/call CRUD latency (p99) | < 30ms | SQLite reads/writes |
| External calls per `/turns` request | 4 (ADP context, Runtime reply, Runtime sentiment, ADP persist) | Fixed; no LLM calls in Voice itself |

---

## 14. Consistency Check (against DEVELOPMENT-PLAYBOOK Part 3)

| Convention | Voice compliance |
|---|---|
| Error shape `{"error":{"code":"...","message":"...","details":{}}}` | Shared `error_response()` helper |
| REST versioning `/v1/...` | All routes prefixed `/v1` |
| Auth header `X-API-Key` for admin | Yes; per-line `X-Line-Key` for inbound, mirrors Channels |
| Python / FastAPI backend | Yes |
| SQLite for local storage | Yes, `voice/data/voice.db` |
| List responses `{"items":[...],"next_cursor":"..."}` | Yes |
| No cross-product imports, HTTP only | Yes — ADP, Agent Runtime, Trust & Reliability all called over HTTP |

---

## 15. Environment / Config

| Variable | Required | Default | Description |
|---|---|---|---|
| `VOICE_API_KEY` | Yes | `change-me` | Admin API key |
| `VOICE_DB_PATH` | No | `data/voice.db` | SQLite path |
| `VOICE_PORT` | No | `8700` | Uvicorn port |
| `VOICE_ADP_URL` | No | `http://localhost:8100` | ADP base URL |
| `VOICE_ADP_API_KEY` | Yes | — | Key to authenticate with ADP |
| `VOICE_RUNTIME_URL` | No | `http://localhost:8001` | Agent Runtime base URL |
| `VOICE_RUNTIME_API_KEY` | Yes | — | Key to authenticate with Agent Runtime |
| `VOICE_TRUST_URL` | No | `http://localhost:8500` | Trust & Reliability base URL |
| `VOICE_TRUST_API_KEY` | Yes | — | Key to authenticate with Trust & Reliability |

---

## 16. Open Questions

- OQ-1: Real telephony integration (Twilio Media Streams or similar) — deferred
  entirely; v1's turn-based API is designed so a future STT/TTS bridge could sit in
  front of it without changing the core call/turn model.
- OQ-2: Streaming turns (partial transcripts / interruption handling) — deferred to a
  later version; v1 is strictly request/response per turn.
- OQ-3: Should sentiment scoring use a dedicated lightweight classifier instead of an
  LLM call, to cut latency/cost? Deferred — v1 reuses the Agent Runtime to avoid a new
  ML dependency; revisit if the double-LLM-call-per-turn cost proves too high.
