# Channels UI — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-channels-ui-design.md`
Location: `channels/ui/` (new Next.js app, port 8201)
Commit prefix: `[channels-ui]`

**Claimed 2026-07-04 — picked from the Agent A bucket in CLAUDE.md's phase-2
split. Design System is fully merged (M1-M6 done). No collision: `channels/ui`
doesn't exist yet, and no other agent has claimed it.**

## Grounding against the real (not spec-imagined) APIs

- `design-system` exports (verified from `design-system/src/*.tsx`, not the
  original spec draft): `AppShell({ nav, productName, title, actions, children })`
  where `NavItem = { label, href, active: boolean }` (active is required);
  `Table({ columns, data, rowKey, emptyMessage })` where `rowKey` is `keyof T`,
  not a function; `Badge({ status: 'success'|'warning'|'error'|'info', ... })`
  (no default, no "neutral"); `Modal({ open, onClose, title, children })`
  (not `onOpenChange`); `useToast().showToast({ message, variant?, duration? })`
  (object arg, not positional); `EmptyState({ icon?, heading, body, action?:
  {label, onClick} })` (not `title`/`description`); `MetricCard({ label, value,
  trend?: {direction, value} })`.
- Channels backend (verified from `channels/src/channels/routes/channels.py`):
  `POST/GET/PATCH/DELETE /v1/channels[/{id}]`, `GET /v1/channels/{id}/stats`,
  `GET /v1/channels/{id}/snippet`. Admin auth: `X-API-Key` header. List shape:
  `{ items: [...], next_cursor }`. Errors: `{ error: { code, message, details } }`.
  Port 8200.
- Agent Studio's agent list (verified from `app/api/agents/route.ts` +
  `lib/agents.ts`): `GET /api/agents` returns `Agent[]` directly (no envelope),
  `Agent = { id, name, instructions, knowledge, enabledTools, createdAt,
  updatedAt }`.

## Status

- [ ] M1: Scaffold `channels/ui` (Next.js app, port 8201, design-system wired in,
      added to root workspaces array)
- [ ] M2: Channel list page + create-channel modal
- [ ] M3: Channel detail page (stats + snippet + pause/resume/revoke)
