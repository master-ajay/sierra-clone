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

- [ ] M1: Tokens + Tailwind preset
- [ ] M2: Workspace conversion (root package.json + existing 4 products wired in)
- [ ] M3: Core components (Button, Card, Input, Select, Badge)
- [ ] M4: AppShell + Table + EmptyState + MetricCard
- [ ] M5: Modal + Toast (Radix-based)
- [ ] M6: Package polish + docs
