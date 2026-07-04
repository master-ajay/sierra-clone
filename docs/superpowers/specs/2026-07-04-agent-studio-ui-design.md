# Product Spec: Agent Studio UI Rebuild (v2)

Spec date: 2026-07-04
Status: Awaiting Gate 1
Depends on: Design System (`2026-07-04-design-system-design.md`) must be merged first.

---

## 1. Problem Statement

Agent Studio's current UI (`app/agents`, `app/agents/[id]/edit`,
`app/agents/[id]/playground`) was built before the shared design system existed, with
its own ad hoc styling. It is being discarded and rebuilt on the shared
`design-system` package so it matches the rest of the platform.

---

## 2. Goals (v1)

- G1: Delete the existing UI code and rebuild the same functional surface (agent
  list, agent create/edit, playground) using `design-system` components.
- G2: No functional regression — every action available today (create agent, edit
  agent config, run playground conversation) must still work identically; only the
  visual layer changes.
- G3: Use `AppShell` as the page frame with nav items for this product's own pages.

---

## 3. Non-Goals

- No new features beyond what exists today — this is a visual rebuild, not a
  product-requirements change.
- No change to `app/api/*` routes or any backend logic.

---

## 4. Users

Same as before: the agent builder configuring and testing agents in Studio.

---

## 5. Functional Requirements

### FR-1: Delete and scaffold

- FR-1.1 Delete `app/agents/**`, keep `app/api/**` untouched.
- FR-1.2 Add `design-system` as a dependency in `app/package.json` (workspace ref);
  update `tailwind.config.js` to use the shared preset.

### FR-2: Agent list page (`/agents`)

- FR-2.1 `Table` of agents (name, model, updated_at) inside `AppShell`, each row
  linking to its edit page. `EmptyState` when no agents exist, with a "Create agent"
  `Button`.
- FR-2.2 "Create agent" opens a `Modal` with an `Input` for name (calls existing
  `POST /api/agents`).

### FR-3: Agent edit page (`/agents/[id]/edit`)

- FR-3.1 Form built from `Input`/`Select`/`Card` sections for the agent's existing
  editable fields (whatever `PATCH /api/agents/[id]` currently accepts — no new
  fields added). Save button uses `Button` primary variant.

### FR-4: Playground page (`/agents/[id]/playground`)

- FR-4.1 Chat-style transcript view (reuse `Card` for message bubbles) + input box
  at the bottom, calling the existing conversation/message endpoints. No new
  conversation features — same request/response shape as today.

---

## 6. Technical Architecture

Same Next.js App Router structure as today, same API routes untouched. Only
`app/agents/**` page components change, importing from `design-system` instead of
local ad hoc CSS/components.

---

## 7. Repo Structure

Unchanged except page/component files under `app/agents/`, now importing
`design-system` components instead of whatever styling exists today.

---

## 8. Milestones

### M1: Delete + scaffold

Delete old `app/agents/**` UI files. Add `design-system` dependency, update Tailwind
config. `AppShell` renders an empty `/agents` route.

**Done when:** App builds and runs with an empty agents page inside `AppShell`. No
old styling artifacts remain (`app/globals.css` reduced to Tailwind directives only,
no leftover ad hoc CSS).

### M2: Agent list + create

**Done when:** `/agents` lists agents in a `Table`, `EmptyState` shows when none
exist, create-agent modal works end-to-end against the existing API. Existing tests
in `tests/` (if any target this page) pass or are updated to match new markup
selectors.

### M3: Agent edit

**Done when:** `/agents/[id]/edit` loads existing agent data, saves changes via the
existing PATCH endpoint, shows a success `Toast`.

### M4: Playground

**Done when:** `/agents/[id]/playground` sends/receives messages through the
existing conversation endpoints, rendering transcript with `Card`.

---

## 9. Acceptance Criteria

1. All three pages (list, edit, playground) are rebuilt using only `design-system`
   components — no bespoke color values or one-off styled divs outside the shared
   token set.
2. Every action that worked before the rebuild still works identically after.
3. `npm test`, `npm run lint`, `npm run typecheck` pass.

---

## 10. Open Questions

- OQ-1: Should the playground gain streaming responses as part of this rebuild? No
  — out of scope; this is a visual rebuild only.
