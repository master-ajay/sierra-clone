# Product Spec: Channels UI (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1
Depends on: Design System (`2026-07-04-design-system-design.md`) must be merged first.

---

## 1. Problem Statement

Channels (`channels/`, port 8200) is API-only today — creating and managing channels
requires calling the REST API directly. This spec adds its first UI: a console for
creating channels, viewing their embed snippet, and monitoring stats, built on
`design-system` from day one (no legacy styling to discard here).

---

## 2. Goals (v1)

- G1: List, create, pause/resume, and revoke channels.
- G2: View a channel's embed snippet (widget `<script>` tag or curl example for API
  channels) ready to copy.
- G3: View a channel's stats (`total_messages`, `total_sessions`, `last_active_at`).
- G4: Use `AppShell` with this product's own nav.

---

## 3. Non-Goals

- No in-console chat testing UI (that's what the embedded widget itself is for).
- No analytics/trends beyond the existing per-channel stats endpoint — cross-channel
  trend analysis belongs to Insights/Explorer, not here.

---

## 4. Functional Requirements

### FR-1: Channel list (`/`)

- FR-1.1 `Table` of channels (name, agent_id, type, status `Badge`, message count)
  from `GET /v1/channels`. `EmptyState` + "Create channel" `Button` when none exist.

### FR-2: Create channel

- FR-2.1 `Modal` with `Input` (name), `Select` (agent — populated by calling Agent
  Studio's `GET /api/agents` — the only cross-product read this UI performs, since
  channel creation needs a valid `agent_id`), `Select` (type: widget/api). Calls
  `POST /v1/channels`.

### FR-3: Channel detail (`/channels/[id]`)

- FR-3.1 `Card` showing channel info, `MetricCard` row for stats
  (`GET /v1/channels/{id}/stats`), and the embed snippet
  (`GET /v1/channels/{id}/snippet`) in a copyable code block.
- FR-3.2 Pause/Resume `Button` (`PATCH /v1/channels/{id}` status toggle), Revoke
  `Button` behind a confirm `Modal` (`DELETE /v1/channels/{id}`).

---

## 5. Technical Architecture

```
channels/ui/            (new Next.js app, port 8201)
  → channels backend (port 8200) — all channel CRUD/stats/snippet calls
  → Agent Studio API (port 3000) — read-only agent list for the create-channel dropdown
```

---

## 6. Repo Structure

```
channels/ui/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  ← channel list
│   └── channels/[id]/page.tsx    ← detail
├── lib/api.ts                     ← typed client for the Channels backend
├── package.json  (dev script: next dev -p 8201)
├── tailwind.config.ts             ← extends design-system preset
└── ...standard Next.js config files
```

---

## 7. Milestones

### M1: Scaffold
**Done when:** `channels/ui` builds and runs on port 8201 with `design-system` wired
in, showing an empty `AppShell`.

### M2: Channel list + create
**Done when:** List and create work end-to-end against the running Channels
backend (mocked in component tests via a fetch mock).

### M3: Channel detail (stats + snippet + pause/revoke)
**Done when:** Detail page shows stats and snippet, pause/resume/revoke all work.

---

## 8. Acceptance Criteria

1. All pages built with `design-system` components only.
2. Full lifecycle (create → view stats → pause → revoke) works against the real
   Channels backend running locally.
3. `npm test`, `npm run lint`, `npm run typecheck` pass.

---

## 9. Open Questions

- OQ-1: Should the agent dropdown cache Agent Studio's agent list, or fetch fresh
  every time the create-modal opens? v1: fetch fresh — traffic is low, no caching
  layer needed yet.
