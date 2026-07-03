# Sierra.ai Next.js Clone — Design Spec

## Problem

sierra.ai is a client-hydrated Next.js (App Router, React Server Components) app. Two prior approaches in this project failed for structural reasons, not implementation bugs:

1. **Raw asset scrape** (`sierra-ai-clone/`): downloaded HTML/CSS/JS verbatim and served it statically. Breaks immediately — the shipped JS bundle expects a live Next.js server (RSC data fetching, `/api/*` routes, build-manifest matching) that doesn't exist in a static copy. Result: React error boundary ("Something went wrong") on every page load.
2. **Frozen DOM snapshot** (`sierra-ai-clone-snapshot/`): rendered each page with headless Chrome, then stripped all `<script>` tags and serialized the final DOM. Non-interactive but crash-free — except most content on sierra.ai is revealed via scroll-triggered animations (initial `opacity: 0`), so a naive snapshot captured everything in its *hidden* state. Fixed via baking computed styles into inline attributes before serialization, but this is fundamentally fragile: every new animation pattern, every dynamic-CDN-proxy asset (`/-/cdn/image?...`, `/-/cdn/video?...`) needs its own one-off fix, and the result is still not real, editable code.

**Conclusion:** neither approach produces something maintainable. The right artifact is an actual Next.js project with real React components.

## Goal

A new Next.js + Tailwind project in this repo that visually and structurally recreates all 14 pages of sierra.ai (home, customers index, learn-more, login, 10 customer case-study pages), including the scroll-reveal animations, built from real component code — not scraped/frozen markup.

## Non-goals

- Pixel-perfect animation timing (Sierra's exact Framer Motion configs — durations, easings, stagger — are not recoverable from compiled output; we approximate with a consistent fade + translateY reveal).
- Backend functionality (the "Sign in" flow, CMS-driven content editing, analytics).
- Redistributing GT America (licensed font) — substituted with Inter.

## Approach: hybrid transcription + refactor

1. **Transcribe first, refactor second.** Use the already-built Puppeteer pipeline (`scratchpad/render/snapshot.mjs`) to capture each page's fully-revealed DOM, preserving Sierra's real Tailwind utility classes (confirmed present directly in `class="..."` attributes, e.g. `text-headline-xl text-white md:mb-6`). Convert that transcribed markup into JSX per page as a first pass — this keeps visual fidelity high because we're reusing real classes, not eyeballing them.
2. **Refactor into components.** 10 of the 14 pages are the same customer-case-study template with different copy/stats/logos. Deduplicate into:
   - `app/layout.tsx` — root layout, font setup, global styles
   - `components/Nav.tsx`, `components/Footer.tsx` — shared chrome
   - `components/Hero.tsx`, `components/CustomerLogos.tsx`, `components/TestimonialCard.tsx`, `components/StatBlock.tsx` — shared building blocks
   - `app/customers/[slug]/page.tsx` — dynamic route driven by `data/customers.ts` (one object per customer: name, headline, stats, quote, logo, hero video/image)
   - `app/page.tsx`, `app/customers/page.tsx`, `app/learn-more/page.tsx`, `app/login/page.tsx` — the 4 unique pages
3. **Theme.** Port the real design tokens into `tailwind.config.ts`: the color palette is directly extractable as CSS custom properties from Sierra's compiled CSS (`--color-green-500: #006838`, full gray/blue/red scales, etc. — already confirmed by inspecting downloaded chunks). Font: Inter via `next/font/google`, standing in for GT America.
4. **Assets.** Reuse images/videos already downloaded during the scraping work (`sierra-ai-clone-snapshot/_assets/*`, ~98MB) rather than re-fetching. Copy into `public/`.
5. **Animations.** For elements identified during scraping as scroll-reveal (their pre-hydration state was `opacity: 0` with a scale/translate transform), wrap with Framer Motion `motion.div` using `whileInView`, a fade + translateY(20–30px), ~0.5s ease-out. Applied consistently rather than per-element-tuned.

## Data flow

Scraped DOM (already captured) → manual/scripted JSX transcription per page → component extraction & dedup → data file for customer pages → styled with ported Tailwind theme → assets copied from existing scrape output.

## Verification

Same discipline as the scraping work: run the Next.js dev server, and for every one of the 14 routes, take a Puppeteer screenshot and visually inspect it (not just check HTTP status or grep text) before considering a page done. This project's history has repeatedly shown that non-visual checks (curl status codes, text-length heuristics) miss real rendering failures.

## Testing

- Dev server boots without errors (`npm run dev`).
- All 14 routes return 200 and render visible, non-blank content (verified via screenshot, not just status code).
- No console errors in the browser for any page.
- Responsive check at one mobile breakpoint (375px) per unique template, since Tailwind classes carry responsive variants (`md:`, `xl:`) from the original site.
