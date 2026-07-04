# Product Spec: Voice UI (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1
Depends on: Design System (`2026-07-04-design-system-design.md`) must be merged first.

---

## 1. Problem Statement

Voice (`voice/`, port 8700) is API-only today. Since v1 has no real telephony (calls
are simulated turn-based sessions), a console is the only way for a person to
actually exercise a call, watch sentiment trend live, and test escalation/payment
flows. This spec adds that console, built on `design-system` from day one.

---

## 2. Goals (v1)

- G1: Create and manage lines.
- G2: Start a simulated call and exchange turns through a chat-style interface,
  seeing sentiment and escalation-recommended state update per turn.
- G3: Escalate a call and view the generated summary.
- G4: Submit a test payment action and see whether it was collected or blocked by
  the guardrail.
- G5: Use `AppShell` with this product's own nav.

---

## 3. Non-Goals

- No real audio/telephony UI (no microphone capture, no audio playback) — turns are
  typed text in and read text out, consistent with the backend's v1 scope.
- No human-rep-specific UI for handling escalated calls — escalation just surfaces
  the summary in this same console.

---

## 4. Functional Requirements

### FR-1: Line list (`/`)

- FR-1.1 `Table` of lines (name, agent_id, status `Badge`) from `GET /v1/lines`.
  `EmptyState` + "Create line" `Button`.

### FR-2: Create line

- FR-2.1 `Modal` with `Input` (name) and `Select` (agent, populated from Agent
  Studio's `GET /api/agents` — same pattern as Channels' UI). Calls `POST
  /v1/lines`.

### FR-3: Call console (`/lines/[id]/call`)

- FR-3.1 Starts a call (`POST /v1/lines/{id}/calls`) on page load, then a
  chat-style transcript (reusing the same visual pattern as Agent Studio's
  playground) where each turn shows the reply plus a small `Badge` for that turn's
  sentiment label.
- FR-3.2 A persistent `sentiment_trend` sparkline-style indicator (simple inline
  chart, not the full `SparklineChart` from Explorer — a minimal one built locally
  here since this is the first product needing it inline in a chat view) and an
  `escalation_recommended` warning `Badge` that appears once the backend flags it.
- FR-3.3 "Escalate" `Button` calls `POST /v1/calls/{id}/escalate`, then displays the
  returned summary in a `Card` above the transcript.
- FR-3.4 "End call" `Button` calls `POST /v1/calls/{id}/end`.

### FR-4: Payment test (within the call console)

- FR-4.1 A "Collect payment" `Button` opens a `Modal` with `Input`s for
  `masked_card_last4`, `amount`, `currency`. Calls `POST /v1/calls/{id}/payment`
  and shows a `Toast` reflecting `collected` or `blocked`.

---

## 5. Technical Architecture

```
voice/ui/               (new Next.js app, port 8701)
  → Voice backend (port 8700) — lines, calls, turns, escalate, payment
  → Agent Studio API (port 3000) — read-only agent list for the create-line dropdown
```

---

## 6. Repo Structure

```
voice/ui/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                     ← line list
│   └── lines/[id]/call/page.tsx     ← call console
├── components/
│   └── SentimentTrendIndicator.tsx  ← small inline chart, local to this product
├── lib/api.ts
├── package.json  (dev script: next dev -p 8701)
├── tailwind.config.ts                ← extends design-system preset
└── ...standard Next.js config files
```

---

## 7. Milestones

### M1: Scaffold
**Done when:** `voice/ui` builds and runs on port 8701 with `design-system` wired in.

### M2: Line list + create
**Done when:** List and create work end-to-end against the running Voice backend.

### M3: Call console — turns + sentiment
**Done when:** Starting a call and exchanging turns renders replies with sentiment
badges and updates the trend indicator and escalation-recommended state per turn.

### M4: Escalate + end + payment
**Done when:** Escalate shows the summary, end call works, and the payment modal
correctly reflects `collected`/`blocked` from the guardrail.

---

## 8. Acceptance Criteria

1. All pages built with `design-system` components only, except the one local
   `SentimentTrendIndicator` component, which itself uses shared tokens/colors.
2. Full lifecycle (create line → start call → exchange turns → escalate → payment →
   end) works against the real Voice backend running locally.
3. `npm test`, `npm run lint`, `npm run typecheck` pass.

---

## 9. Open Questions

- OQ-1: Same as Insights/Explorer's OQ-1 — if a second product needs an inline trend
  chart, consider promoting a shared chart primitive into `design-system` at that
  point rather than now.
