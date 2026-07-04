# Design System — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-design-system-design.md`
Location: `design-system/` (new npm workspace member) + root `package.json` conversion
Commit prefix: `[design-system]`

**Claimed 2026-07-04 11:2x — this is the hard-blocking prerequisite for every
product UI spec below it. Building solo since it explicitly can't be
parallelized (spec's own consistency-check row: "owned by whichever agent
builds it first"). Once merged, treat `design-system/` as read-only shared
infra, same as `docs/superpowers/`.**

## Known spec/repo mismatch to resolve during M2

The spec's workspace list includes `"app"` as a member with its own
`package.json`, but Agent Studio's `package.json` already lives at the repo
**root** (its `app/` directory is just the Next.js App Router folder, not a
separate npm package). Resolution: root `package.json` gains a `"workspaces"`
array listing `design-system`, `ghostwriter`, `explorer`, `trust/ui`,
`channels/ui`, `expert-answers/ui`, `voice/ui` (NOT `"app"` — there is no
`app/package.json` to reference), and depends on `design-system` directly in
its own `dependencies`, since the root package.json *is* Agent Studio's.

## Status

- [x] M1: Tokens + Tailwind preset — verified `.bg-brand-primary` compiles to `#1B4332`
- [x] M2: Workspace conversion — all 4 existing products build/lint/test clean; fixed a
  pre-existing root tsconfig.json bug (unbounded include glob) found during verification
- [ ] M3: Core components (Button, Card, Input, Select, Badge)
- [ ] M4: AppShell + Table + EmptyState + MetricCard
- [ ] M5: Modal + Toast (Radix-based)
- [ ] M6: Package polish + docs
