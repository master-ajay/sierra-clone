# Product Spec: Insights/Explorer UI Rebuild (v2)

Spec date: 2026-07-04
Status: Awaiting Gate 1
Depends on: Design System (`2026-07-04-design-system-design.md`) must be merged first.

---

## 1. Problem Statement

Explorer's current UI (`explorer/src/app/{page,insights,search,sessions,
top-questions}` + its own `components/`) predates the shared design system and
duplicates component concepts (`MetricCard`, badges) that now live in
`design-system`. It is being discarded and rebuilt to match the rest of the
platform, keeping its existing backend routes unchanged.

---

## 2. Goals (v1)

- G1: Delete existing page and component code, rebuild the same functional surface
  (session list/detail, search, top questions, insights/trends) on `design-system`.
- G2: Replace bespoke local components (`MetricCard`, `ConfidenceBadge`,
  `GuardrailBadge`, `SparklineChart`, `TraceMessage`, `SessionTable`) with
  `design-system` equivalents where one exists (`MetricCard`, `Badge`, `Table`);
  keep genuinely domain-specific ones (`SparklineChart`, `TraceMessage`) as local
  components that *use* `design-system` primitives internally rather than
  reinventing buttons/cards/colors.
- G3: No functional regression against existing API routes.

---

## 3. Non-Goals

- No new analytics features — visual rebuild only.
- No changes to backend routes (trends/breakdowns/rollups, sessions, search).

---

## 4. Functional Requirements

### FR-1: Delete and scaffold

- FR-1.1 Delete `explorer/src/app/{page.tsx,insights,search,sessions,
  top-questions}` and the now-redundant local components (`MetricCard.tsx`,
  `GuardrailBadge.tsx`, `ConfidenceBadge.tsx`, `SessionTable.tsx`). Keep
  `SparklineChart.tsx` and `TraceMessage.tsx` (domain-specific, no
  `design-system` equivalent), refactored to use shared tokens/components
  internally instead of ad hoc styling.
- FR-1.2 Add `design-system` dependency; update Tailwind config.

### FR-2: Insights/trends (`/insights`)

- FR-2.1 `MetricCard` row (from `design-system`) for headline stats, `SparklineChart`
  (kept, restyled) for trend lines, calling the existing trends/breakdowns routes.

### FR-3: Sessions (`/sessions`, `/sessions/[id]`)

- FR-3.1 `Table` of sessions with `Badge` for confidence/guardrail status (replacing
  `ConfidenceBadge`/`GuardrailBadge` with `design-system`'s `Badge` + status tokens).
  Detail page renders `TraceMessage` (kept) inside a `Card`.

### FR-4: Search (`/search`) and Top Questions (`/top-questions`)

- FR-4.1 Same functional behavior as today, rebuilt with `Input`/`Table`/`Card`.

---

## 5. Milestones

### M1: Delete + scaffold
**Done when:** App builds with an empty home route inside `AppShell`; only
`SparklineChart` and `TraceMessage` remain from the old `components/` dir.

### M2: Sessions list + detail
**Done when:** `/sessions` and `/sessions/[id]` render against existing routes with
`Table`, `Badge`, `TraceMessage`.

### M3: Insights/trends
**Done when:** `/insights` renders `MetricCard`s and `SparklineChart` from existing
trend/breakdown routes.

### M4: Search + top questions
**Done when:** Both pages work end-to-end against existing routes.

---

## 6. Acceptance Criteria

1. Redundant local components (`MetricCard`, `ConfidenceBadge`, `GuardrailBadge`,
   `SessionTable`) are removed in favor of `design-system` equivalents.
2. `SparklineChart` and `TraceMessage` are kept but restyled onto shared tokens.
3. Every existing page's functional behavior is unchanged.
4. `npm test`, `npm run lint`, `npm run typecheck` pass.

---

## 7. Open Questions

- OQ-1: Should `SparklineChart` eventually move into `design-system` if another
  product needs a trend chart (e.g. Voice's sentiment trend)? Deferred — promote it
  only when a second consumer actually needs it, not speculatively.
