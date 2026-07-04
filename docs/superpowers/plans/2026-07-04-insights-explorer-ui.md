# Insights/Explorer UI Rebuild — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-insights-explorer-ui-design.md`
Location: `explorer/` (Next.js app, port 8400)
Commit prefix: `[insights-explorer-ui]`

**Claimed 2026-07-04 ~12:12 — Agent Studio UI is done (my original phase-2
bucket, Agent Studio/Channels/Voice, is fully complete since another agent
built Channels UI and Voice UI). Picking up Insights/Explorer next since I
have the most context here (built the Insights rollup/trends backend
addendum earlier this session).**

## Known spec gap to resolve during M1/M3

FR-1.1 deletes `explorer/src/app/page.tsx` (the original dashboard, which used
`/api/metrics` with today/7d/30d windows) but the spec's FR list never defines
a replacement for it — FR-2 only covers `/insights` (trends/breakdowns via the
rollup routes I added earlier, with day/week/month windows). These are two
distinct, currently-separate routes. Resolution: consolidate them - `/insights`
becomes the one analytics home page (headline stats + trend + breakdowns), and
`/` redirects to `/insights` (same pattern Agent Studio's `/` -> `/agents`
redirect uses), rather than leaving two separate dashboard-shaped pages.

## Status

- [x] M1: Delete + scaffold (design-system dependency, Tailwind preset, keep
  only SparklineChart + TraceMessage from old components/, empty AppShell)
- [x] M2: Sessions list + detail (Table, Badge, TraceMessage)
- [x] M3: Insights/trends (MetricCard row + SparklineChart, absorbing the old
  dashboard's job per the gap above; `/` redirects here)
- [x] M4: Search + top questions (Input/Table/Card)

All 4 milestones complete. 50/50 tests passing, lint clean, tsc --noEmit
clean, build clean. Live-verified end-to-end against real ADP + Channels
data for every page (sessions list/detail, insights snapshot + trends,
search, top questions).
