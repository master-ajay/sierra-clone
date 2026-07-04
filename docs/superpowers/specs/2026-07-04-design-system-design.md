# Product Spec: Design System (v1)

Spec date: 2026-07-04
Status: Awaiting Gate 1

---

## 1. Problem Statement

Four products already have independently-built Next.js UIs (Agent Studio, Ghostwriter,
Insights/Explorer, and a partial Trust & Reliability UI), each built by a separate
agent with no shared visual language. Three more products (Channels, Expert Answers,
Voice) have no UI at all. The result today is inconsistency at best and, for the three
missing UIs, no console presence whatsoever — neither matches the unified, polished
feel of Sierra's real product suite, which uses one consistent design language (deep
green + warm neutral palette, minimal card-based layouts, workspace-style navigation)
across every product surface. This spec defines that shared design language and the
package that delivers it, so every product UI (existing or new) draws from one source
instead of reinventing its own.

---

## 2. Goals (v1)

- G1: Define the visual language — color tokens, type scale, spacing scale — grounded
  in Sierra's actual brand guidelines (deep forest green primary, warm beige/cream
  secondary, high-contrast charcoal text, restrained neutral grays).
- G2: Ship a local, internal npm package (`design-system/`) exposing a Tailwind
  preset and a set of shared React components so every product's Next.js app can
  consume the same visual primitives.
- G3: Provide an app shell component (sidebar nav + topbar) that each product
  configures with its own nav items and active-product indicator, so navigating
  between products (once linked) feels like one platform.
- G4: Provide the component set needed by every downstream product spec: Button,
  Card, Table, Badge/StatusPill, Input, Select, Modal, Toast, EmptyState, MetricCard.
- G5: Turn the repo into an npm workspace (root `package.json` with `workspaces`)
  so product UIs can depend on `design-system` via a workspace reference instead of
  copy-pasting code.

---

## 3. Non-Goals (explicitly out of scope for v1)

- No dark mode — Sierra's own marketing surfaces show no confirmed dark mode; v1
  ships light mode only. Tokens are structured so dark mode could be added later
  without a rework, but it is not built now.
- No Storybook or visual regression test suite — component correctness is verified
  by each consuming product's own pages and a small set of unit tests on the shared
  components themselves.
- No pixel-exact replication of Sierra's marketing site — that site is built by an
  external agency (Bakken & Baeck) with custom illustration, photography, and motion
  work outside the scope of an internal admin console. This spec targets the
  *console* experience (workspace, minimal, card-based), not the marketing site.
- No second typeface — sans-serif (Inter) only; a display/serif face for
  marketing-style moments is a possible fast-follow, not v1.
- No shared business logic, data-fetching hooks, or API clients — this package is
  presentation-only. Each product's UI still talks directly to its own backend,
  preserving the "no cross-product imports" rule for logic.
- No animation/motion system beyond simple CSS transitions (fade/slide) — no
  dependency on Framer Motion or similar.

---

## 4. Users

**Primary — the engineers building each product's UI** (including future agents):
import the package, use its Tailwind preset and components, get a consistent look
with minimal per-product styling work.

**Indirect — end users of every product's console:** experience one visually
coherent platform instead of seven differently-styled tools.

---

## 5. Functional Requirements

### FR-1: Workspace conversion

- FR-1.1 Add a root `package.json` with `"workspaces"` covering `design-system`,
  `app` (Agent Studio), `ghostwriter`, `explorer`, `trust/ui`, and the three
  soon-to-exist UI dirs (`channels/ui`, `expert-answers/ui`, `voice/ui`) so a single
  `npm install` at the root links `design-system` into each without publishing.
- FR-1.2 Existing products' `package.json` files are updated to depend on
  `"design-system": "*"` (resolved via the workspace), not copy-pasted files.

### FR-2: Design tokens

- FR-2.1 `design-system/tokens.ts` exports the color scale, spacing scale, and type
  scale as plain JS objects (single source of truth).
- FR-2.2 `design-system/tailwind-preset.js` — a Tailwind preset consuming those
  tokens, so each product's `tailwind.config.js` is just
  `presets: [require('design-system/tailwind-preset')]` plus its own `content` glob.
- FR-2.3 Color tokens (semantic names, not raw hex, so consuming code never
  hardcodes a color):
  - `brand.primary` (forest green, ~`#1B4332`, with a light/dark step for
    hover/active states)
  - `bg.base` (warm beige/cream, ~`#F5F1E8`) — the app's background
  - `bg.surface` (white) — card/panel background sitting on top of `bg.base`
  - `text.primary` (charcoal, ~`#1F2422`), `text.muted` (neutral gray)
  - `border.default` (neutral gray, low contrast)
  - `status.success`, `status.warning`, `status.error`, `status.info` — desaturated
    semantic colors that don't compete with `brand.primary`

### FR-3: Shared components

- FR-3.1 `AppShell` — sidebar (product switcher placeholder + nav items passed as
  props) + topbar (page title slot + right-aligned actions slot) + main content
  area. Each product renders its pages inside `<AppShell nav={...}>`.
- FR-3.2 `Button` — variants `primary` (filled brand green), `secondary` (outlined),
  `ghost` (text-only), `destructive` (uses `status.error`). Sizes `sm`/`md`.
- FR-3.3 `Card` — surface container with consistent padding/border/radius.
- FR-3.4 `Table` — header row, sortable-column-ready (visual only, sorting logic is
  the consuming product's job), zebra-free (border-based row separation, matching
  the minimal aesthetic).
- FR-3.5 `Badge` / `StatusPill` — small pill for status values (e.g. `active`,
  `paused`, `pending_review`), colored via the `status.*` tokens.
- FR-3.6 `Input`, `Select` — form controls with label, error-state styling, and
  focus rings using `brand.primary`.
- FR-3.7 `Modal` — overlay + panel, built on a Radix `Dialog` primitive for
  accessibility (focus trap, escape-to-close, ARIA roles).
- FR-3.8 `Toast` — transient notification, top-right stack, auto-dismiss.
- FR-3.9 `EmptyState` — icon/illustration slot + heading + body + optional action
  button, for empty lists across every product.
- FR-3.10 `MetricCard` — label + big number + optional trend indicator, for
  dashboard-style stats (Insights, Channels stats, Voice call counts, etc.).

### FR-4: Consumption contract

- FR-4.1 Every component is exported from a single `design-system` package entry
  point (`import { Button, Card, AppShell } from 'design-system'`), not deep import
  paths, so the public surface is easy to reason about and change later.
- FR-4.2 Components accept `className` passthrough for the rare per-product
  one-off, but products must not override token colors directly — any need to do so
  is a sign the token set is missing something and should be added here instead.

---

## 6. Technical Architecture

```
design-system/                     (new package, npm workspace member)
  ├── tokens.ts                     ← single source of truth for colors/spacing/type
  ├── tailwind-preset.js            ← Tailwind preset built from tokens.ts
  └── src/
      ├── AppShell.tsx
      ├── Button.tsx
      ├── Card.tsx
      ├── Table.tsx
      ├── Badge.tsx
      ├── Input.tsx / Select.tsx
      ├── Modal.tsx                 ← wraps @radix-ui/react-dialog
      ├── Toast.tsx
      ├── EmptyState.tsx
      ├── MetricCard.tsx
      └── index.ts                  ← re-exports everything

Consuming product (e.g. app/, ghostwriter/, channels/ui/):
  tailwind.config.js  →  presets: [require('design-system/tailwind-preset')]
  any page.tsx        →  import { AppShell, Card, Button } from 'design-system'
```

No product imports another product's UI code — only `design-system`, which contains
zero business logic and zero knowledge of any product's data model or API.

---

## 7. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 18 (via each product's own Next.js 14 app) | Matches existing products |
| Styling | Tailwind CSS, shared preset | Matches existing `Stack` note in `CLAUDE.md` |
| Accessible primitives | Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-select`, etc.) | Industry-standard accessible building blocks; shadcn/ui conventions on top |
| Package management | npm workspaces | No new tooling (pnpm/yarn) beyond what's already in use |
| Testing | Vitest + React Testing Library | Matches existing `npm test` convention in `CLAUDE.md` |
| Lint / typecheck | `next lint` / `tsc --noEmit` per consuming product; `tsc --noEmit` inside `design-system` itself | Matches existing per-product convention |

---

## 8. Repo Structure

```
design-system/
├── tokens.ts
├── tailwind-preset.js
├── src/
│   ├── AppShell.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Table.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   ├── EmptyState.tsx
│   ├── MetricCard.tsx
│   └── index.ts
├── tests/
│   ├── Button.test.tsx
│   ├── Modal.test.tsx
│   └── AppShell.test.tsx
├── package.json
├── tsconfig.json
└── .gitignore
```

Root `package.json` (new) adds:
```json
{
  "private": true,
  "workspaces": [
    "design-system",
    "app",
    "ghostwriter",
    "explorer",
    "trust/ui",
    "channels/ui",
    "expert-answers/ui",
    "voice/ui"
  ]
}
```

---

## 9. Milestones

### M1: Tokens + Tailwind preset

`tokens.ts`, `tailwind-preset.js`. No components yet.

**Done when:** A throwaway test app can apply the preset and render a div with
`bg-brand-primary` and see the correct green. `tsc --noEmit` clean.

### M2: Workspace conversion

Root `package.json` with `workspaces`. Update `app/package.json`,
`ghostwriter/package.json`, `explorer/package.json`, `trust/ui/package.json` to
depend on `design-system`.

**Done when:** `npm install` at repo root succeeds and links `design-system` into
each existing product without errors. Existing products still build
(`npm run build` in each) — this milestone must not break anything already shipped.

### M3: Core components (Button, Card, Input, Select, Badge)

**Done when:** Each has a passing Vitest + RTL test covering its variants/states.
`tsc --noEmit` clean.

### M4: AppShell + Table + EmptyState + MetricCard

**Done when:** `AppShell` renders sidebar nav from props and a content slot; `Table`
renders rows/columns; `EmptyState` and `MetricCard` render their slots correctly.
Tests pass.

### M5: Modal + Toast (Radix-based)

**Done when:** `Modal` traps focus and closes on Escape (tested via RTL + userEvent);
`Toast` stacks and auto-dismisses on a timer (tested with fake timers). Tests pass.

### M6: Package polish + docs

`index.ts` re-exports everything; a short `design-system/README.md` documents each
component's props (generated from TypeScript types, not hand-maintained prose).

**Done when:** `import { Button, Card, AppShell, Table, Badge, Input, Select, Modal,
Toast, EmptyState, MetricCard } from 'design-system'` type-checks from a consuming
product. All tests + `tsc --noEmit` clean across the whole workspace.

---

## 10. Acceptance Criteria (v1 overall)

1. Root `npm install` succeeds and resolves `design-system` into every listed
   workspace member.
2. Every existing product (`app/`, `ghostwriter/`, `explorer/`, `trust/ui/`) still
   builds and passes its own tests after depending on `design-system` — this spec
   does not yet restyle their pages, only makes the dependency available.
3. All 10 components (§5 FR-3) exist, are exported from one entry point, and have
   passing tests.
4. Color/spacing/type tokens are defined once in `tokens.ts` and consumed via the
   Tailwind preset — no product hardcodes a hex value for brand green, beige
   background, or charcoal text.
5. `Modal` and `Toast` meet basic accessibility checks (focus trap, Escape-to-close,
   ARIA roles present).
6. `tsc --noEmit` and `npm test` pass with zero errors across `design-system` and
   every consuming product.

---

## 11. Consistency Check (against DEVELOPMENT-PLAYBOOK Part 3)

| Convention | Design System compliance |
|---|---|
| Next.js + TypeScript + Tailwind stack | Yes — this *is* the shared Tailwind layer |
| `npm test` / `npm run lint` / `npm run typecheck` | Yes, same scripts, workspace-aware |
| No cross-product imports | Preserved — only presentational code is shared, no business logic or API clients |
| Each agent owns one directory | This package is owned by whichever agent builds it first; once merged it becomes read-only shared infrastructure like the DEVELOPMENT-PLAYBOOK itself |

---

## 12. Environment / Config

No environment variables — this package has no backend, no network calls, no
secrets. It is pure UI.

---

## 13. Open Questions

- OQ-1: Should `design-system` version itself independently (semver) so consuming
  products can pin a version, or always float to workspace `latest`? v1: always
  float — there's only one version in a monorepo workspace, versioning is deferred
  until/if this ever needs to be published externally.
- OQ-2: Icon set — Sierra's real brand likely has custom iconography; v1 uses a
  standard open icon set (Lucide, since it's the common shadcn/ui pairing) rather
  than commissioning custom icons. Revisit if the generic icon look feels off once
  products are restyled.
- OQ-3: Once product UIs consume this package, should there be a cross-product nav
  (e.g. a top-level switcher to jump from Agent Studio to Insights)? Deferred to a
  future spec — each product's UI spec covers its own pages only; a unifying shell
  that links between products' separate Next.js apps is a distinct, larger problem
  (routing across separately-deployed apps) not solved here.
