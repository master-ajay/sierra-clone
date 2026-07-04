# Product Spec: Trust & Reliability UI Rebuild (v2)

Spec date: 2026-07-04
Status: Awaiting Gate 1
Depends on: Design System (`2026-07-04-design-system-design.md`) must be merged first.

---

## 1. Problem Statement

Trust & Reliability's current UI (`trust/ui/app/{page,rate-limits,audit,
audit/[id]}`) predates the shared design system. It is being discarded and rebuilt
to match the rest of the platform, keeping its existing backend routes
(`routes/system.py`, `routes/audit.py`, `routes/check.py`) unchanged.

---

## 2. Goals (v1)

- G1: Delete existing page code, rebuild the same functional surface (dashboard,
  rate limits, audit log list/detail) on `design-system`.
- G2: Replace the local `StatusBadge` component with `design-system`'s `Badge`.
- G3: No functional regression against existing API routes.

---

## 3. Non-Goals

- No new guardrail features — visual rebuild only.
- No change to `trust/src/trust/routes/**`.

---

## 4. Functional Requirements

### FR-1: Delete and scaffold

- FR-1.1 Delete `trust/ui/app/{page.tsx,rate-limits,audit}` and
  `trust/ui/components/StatusBadge.tsx`.
- FR-1.2 Add `design-system` dependency; update `trust/ui/tailwind.config.ts` to the
  shared preset; keep `trust/ui/lib/api.ts` (backend client) unchanged.

### FR-2: Dashboard (`/`)

- FR-2.1 `MetricCard` row for headline guardrail stats (block rate, checks run,
  etc. — whatever the existing system/stats route returns).

### FR-3: Rate limits (`/rate-limits`)

- FR-3.1 `Table` of rate-limit rules/status, `Badge` for active/exceeded state,
  calling the existing rate-limits route unchanged.

### FR-4: Audit log (`/audit`, `/audit/[id]`)

- FR-4.1 `Table` of audit entries with `Badge` for verdict (allowed/blocked),
  linking to a detail page rendered in a `Card`.

---

## 5. Milestones

### M1: Delete + scaffold
**Done when:** App builds with an empty home route inside `AppShell`.

### M2: Dashboard
**Done when:** `/` renders `MetricCard`s from the existing stats route.

### M3: Rate limits
**Done when:** `/rate-limits` renders the existing route's data in a `Table` with
`Badge` status.

### M4: Audit log
**Done when:** `/audit` and `/audit/[id]` render list/detail against existing
routes.

---

## 6. Acceptance Criteria

1. `StatusBadge` is removed in favor of `design-system`'s `Badge`.
2. Every existing page's functional behavior is unchanged.
3. `npm test`, `npm run lint`, `npm run typecheck` pass.

---

## 7. Open Questions

None — this is a contained visual rebuild of an already-scoped product.
