# Agent Studio

Sierra-inspired build: working software for what Sierra.ai's "Agent Studio"
product does (define an agent's instructions/knowledge/tools, test it in a
chat playground), not a clone of Sierra's marketing site. Product 1 of a
planned 7-area build; see `docs/superpowers/specs/2026-07-03-agent-studio-design.md`
for the full spec and `docs/superpowers/plans/2026-07-03-agent-studio.md` for
the task-by-task implementation plan.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, SQLite via
`better-sqlite3` (`data/studio.db`), Groq's OpenAI-compatible API via the
`openai` SDK.

## Workflow

Solo trunk-based development, autonomous end-to-end per task — no human
review gate:

```
Requirement -> Break into tasks -> Plan -> Implement (TDD) -> Tests
  -> Lint & typecheck -> Self-review -> Commit to master
```

- `npm test` — Vitest
- `npm run lint` — next lint
- `npm run typecheck` — tsc --noEmit

All three must pass before a task is considered done. Progress against the
plan is tracked in `.superpowers/sdd/progress.md` (git-ignored scratch
ledger — if it's ever missing, reconstruct it from `git log` and, if needed,
this project's own Claude Code session transcripts under
`~/.claude/projects/`, not from memory).

## Coding rules

- TDD: write the failing test first, then the implementation.
- No comments unless explaining a non-obvious *why*.
- Don't add abstractions, error handling, or scope beyond what the current
  task specifies.
