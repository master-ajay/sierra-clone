# Expert Answers — Implementation Plan

Spec: `docs/superpowers/specs/2026-07-04-expert-answers-design.md`
Location: `expert-answers/` subdirectory (FastAPI Python service, port 8600)
Commit prefix: `[expert-answers]`

## Status

- [x] M1: Scaffold + DB + Health (GET /v1/health, auth, migrations)
- [x] M2: Resolution ingestion (POST /v1/resolutions, transcript or adp_session_id)
- [x] M3: Draft generation (Agent Runtime call, mocked via respx)
- [x] M4: Review workflow (GET/PATCH /v1/articles, status transitions)
- [x] M5: Published articles endpoint + integration test

## All 23 tests passing — ruff clean
