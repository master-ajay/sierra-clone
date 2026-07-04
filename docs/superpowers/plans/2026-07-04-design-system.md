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
- [x] M3: Core components (Button, Card, Input, Select, Badge) — 29 tests
- [x] M4: AppShell + Table + EmptyState + MetricCard — 49 tests total (Table's
  generic constraint was relaxed from `T extends Record<string,unknown>` to
  plain `T`, since consuming interfaces don't have index signatures)
- [x] M5: Modal + Toast (Radix-based) — 59 tests total; Modal wraps
  `@radix-ui/react-dialog` directly, Toast is a context (`ToastProvider` +
  `useToast()`) since stacking notifications need shared state
- [x] M6: Package polish + docs — `src/index.ts` re-exports all 10 components +
  their types; verified the full import list type-checks from a real
  consuming product (explorer) via a throwaway file, not just design-system's
  own tsc; `README.md` added with a props table per component

## Final verification (all acceptance criteria, 2026-07-04)

- `design-system`: 59/59 tests passing, `tsc --noEmit` clean.
- Root (Agent Studio), `ghostwriter/`, `explorer/`: each builds, lints, and
  passes its full test suite with `design-system` as a dependency.
- `trust/ui/`: builds and lints clean (no test suite of its own, matches its
  pre-existing state).
- `channels/ui/`, `expert-answers/ui/`, `voice/ui/` are in the root workspaces
  array but don't exist yet — npm tolerates the missing paths (verified in a
  scratch dir before touching the real repo); whichever agent scaffolds one
  of those just adds `"design-system": "*"` to its own `package.json`, no
  further root changes needed.
- **Merged and ready**: `design-system/` is now read-only shared infrastructure.
  Product UI work (per CLAUDE.md's phase-2 split) can start.
