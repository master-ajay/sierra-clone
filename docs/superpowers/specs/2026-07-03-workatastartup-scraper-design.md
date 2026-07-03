# Work at a Startup Scraper — Design

Date: 2026-07-03

## Goal

Build a production-ready, async Playwright scraper that starts from a single
Work at a Startup companies search URL and discovers every matching company
and every job posted by those companies, storing results in SQLite and
exporting to CSV/JSON. No company names or job URLs are hardcoded; everything
is discovered by crawling from the seed URL.

Seed URL:
```
https://www.workatastartup.com/companies?demographic=any&hasEquity=any&hasSalary=any&industry=any&interviewProcess=any&jobType=fulltime&layout=list-compact&role=eng&sortBy=created_desc&tab=any&usVisaNotRequired=any
```

## Decisions

- **Database:** SQLite via SQLAlchemy async engine. Single-file, zero-config.
- **Auth:** Work at a Startup requires a YC account login to see full company
  and job detail. A dedicated `python main.py login` command opens a headed
  Playwright browser against a persistent user-data-dir
  (`./playwright-profile/`) so the user can sign in manually once. All other
  commands (`scrape`, `scrape-companies`, `scrape-jobs`, `resume`) reuse that
  profile and run headless by default (configurable `--headed` override).
- **Discovery scale:** Full catalog by default (paginate/scroll until
  exhausted). A `--limit N` flag caps the number of companies/jobs processed,
  for fast test runs.
- **Data source per page:** Auto-detect. On the companies page (and, by the
  same mechanism, on company/job detail pages), the scraper listens to
  network responses during page load and one scroll/interaction cycle. If a
  JSON response is found whose body looks like structured company/job data
  (array of objects with name/slug/title-like keys), that endpoint is treated
  as the source of truth and replayed directly (with any cursor/offset
  params) for subsequent pages instead of re-rendering the DOM. If no such
  endpoint is found, the scraper falls back to parsing the rendered DOM. The
  active mode is logged so it's visible which strategy is being used.
- **Raw HTML storage:** Saved to disk under `output/raw_html/<job_slug>.html`;
  the `Job` row stores only the file path, keeping the DB small.

## Architecture

```
scraper/
├── main.py                      # Typer CLI entrypoint
├── config.py                    # Pydantic Settings: concurrency, delays, paths, profile dir
├── browser/
│   ├── session.py                # persistent-context Playwright launcher
│   └── network_probe.py          # detects JSON API vs DOM-only per page type
├── db/
│   ├── models.py                  # SQLAlchemy models: Company, Job
│   ├── session.py                 # async engine/session factory
│   └── repository.py              # upsert/dedupe, first_seen/last_seen/content_hash, status tracking
├── scrapers/
│   ├── companies.py               # company list discovery, pagination/infinite scroll
│   ├── company_detail.py          # per-company page visit, profile + job link extraction
│   └── job_detail.py              # per-job page visit, full field extraction, raw HTML save
├── parsers/
│   ├── company_parser.py          # DOM/JSON -> CompanyData
│   └── job_parser.py              # DOM/JSON -> JobData
├── models/
│   └── schemas.py                  # Pydantic: CompanyData, JobData (Step 8 shape)
├── utils/
│   ├── retry.py                    # exponential backoff + jitter wrapper
│   ├── ratelimit.py                 # semaphore concurrency + randomized delay
│   └── hashing.py                   # content_hash computation
├── exporters/
│   ├── csv_export.py
│   └── json_export.py
└── cli/
    └── commands.py                 # scrape / scrape-companies / scrape-jobs / resume / export / login
```

## Data Flow

1. **Login** (one-time, manual): `login` command opens a headed browser
   against the persistent profile dir; user signs into YC; cookies persist.
2. **Company discovery**: `companies.py` opens the seed URL. `network_probe`
   determines API-first or DOM-fallback mode. The scraper pages/scrolls until
   no new companies appear, deduping by slug, and upserts skeleton `Company`
   rows (name, url, slug, description, logo_url, status=pending).
3. **Company detail pass**: for each company with `status=pending` (or forced
   refresh), visit its page, extract full profile fields (name, website,
   batch, stage, industry, location, founders, team size, description), and
   collect every job link found on the page into skeleton `Job` rows
   (`company_id` FK, status=pending). Mark company `status=done`.
4. **Job detail pass**: for each job with `status=pending`, visit its URL,
   extract all fields (title, company, location, remote, salary, equity,
   employment type, experience, visa sponsorship, technologies, description,
   responsibilities, requirements, posted date, apply URL, canonical URL),
   save raw HTML to disk, compute `content_hash`, upsert with
   `first_seen`/`last_seen`, mark `status=done`.
5. Each pass is bounded by an `asyncio.Semaphore` sized by `--concurrency`,
   every navigation wrapped in retry/backoff, and a random delay between
   requests (`--min-delay`/`--max-delay`).
6. **Resume**: any row left `status=pending` or `status=error` (from a prior
   interrupted run) is retried by `resume` without re-processing completed
   rows. SIGINT/SIGTERM triggers a graceful shutdown that lets in-flight
   upserts finish before exiting.

## Storage Schema

**Company**
- id (PK), slug (unique), name, url, description, logo_url
- website, yc_batch, stage, industry, location, founders (JSON list), team_size
- status (pending/done/error), last_error
- first_seen, last_seen, content_hash

**Job**
- id (PK), company_id (FK -> Company), job_url (unique)
- title, location, remote (bool), salary, equity, employment_type, experience
- visa_sponsorship, technologies (JSON list), description, responsibilities (JSON list)
- requirements (JSON list), posted_date, apply_url, canonical_url
- raw_html_path
- status (pending/done/error), last_error
- first_seen, last_seen, content_hash

Both tables upsert on their unique key (slug / job_url) — re-running never
creates duplicates; existing rows get `last_seen` and `content_hash` updated,
and any changed fields refreshed.

## CLI

```bash
python main.py login                 # one-time manual YC sign-in
python main.py scrape [--limit N] [--concurrency N] [--headed]
python main.py scrape-companies [--limit N]
python main.py scrape-jobs [--limit N]
python main.py resume
python main.py export csv
python main.py export json
```

## Error Handling & Reliability

- Retry wrapper: exponential backoff with jitter, configurable max attempts,
  applied to page navigation and extraction steps.
- Failures are recorded (`status=error`, `last_error` message) rather than
  crashing the run or being silently dropped; `resume` specifically retries
  error rows.
- Browser contexts are reused across requests within a pass (not
  re-launched per page) for performance.
- Rich-based logging shows progress, active discovery mode (API vs DOM), and
  per-phase counts.

## Output Shape (export)

Matches Step 8 exactly:
```json
{
  "company": "",
  "company_url": "",
  "title": "",
  "location": "",
  "salary": "",
  "equity": "",
  "remote": false,
  "description": "",
  "requirements": [],
  "technologies": [],
  "apply_url": "",
  "job_url": ""
}
```

## Testing

- Unit tests for parsers using saved HTML/JSON fixtures → expected Pydantic
  objects.
- Unit tests for repository upsert/dedupe logic against a temp SQLite DB.
- Unit tests for retry/backoff behavior (simulated failures).
- No live-network tests by default (site requires auth and is a live
  third-party service).
