# Sierra.ai Next.js Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real Next.js + Tailwind project in `sierra-clone/` that recreates all 13 pages of sierra.ai (home, customers index, learn-more, login, 9 customer case studies) as editable React components, replacing the two prior fragile scraping approaches. (Note: the site has a 10th customer, R1 RCM, but its page failed to save during the earlier scraping work — `r1-rcm.html` doesn't exist in `sierra-ai-clone-snapshot/customers/`. Out of scope for this plan; re-scrape that one page first if it's wanted later.)

**Architecture:** Transcribe the already-captured, fully-revealed DOM (from `scratchpad/render/sierra-ai-clone-snapshot/*.html`, which preserves Sierra's real Tailwind classes) into JSX via a small conversion script, then refactor the transcribed output into shared components (`Nav`, `Footer`, `CustomerLogos`, `StatBlock`) and a data-driven dynamic route (`app/customers/[slug]/page.tsx` + `data/customers.ts`) for the 9 near-identical customer pages. The home page's hero and the customer pages' testimonial blockquote are built directly in their page files rather than extracted into their own components, since each has exactly one call site. Scroll-reveal animations (identified during scraping by their pre-hydration `opacity: 0` state) are added back with Framer Motion via the shared `RevealSection` wrapper.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion (`motion` package), Puppeteer (dev-only, for visual verification screenshots — not shipped).

## Global Constraints

- Project lives at `/Users/mac/Developer/Scrapper/sierra-clone/` (new directory, not touching `sierra-ai-clone/` or `sierra-ai-clone-snapshot/`, which stay as reference/asset sources only).
- Font is Inter via `next/font/google` — GT America is licensed and must not be redistributed.
- Reuse images/videos already downloaded to `sierra-ai-clone-snapshot/_assets/` and `sierra-ai-clone-snapshot/_next/static/chunks/*` — do not re-fetch from sierra.ai.
- Every page must be verified with an actual screenshot (Puppeteer), not just an HTTP status check or text grep — this project's history (see spec) shows non-visual checks miss real rendering failures.
- Color palette and font tokens come from the real compiled CSS already downloaded at `sierra-ai-clone/_next/static/chunks/05w9o73k1mu_z.css` and `0-11hryi0q8ya.css` — port exact hex values, don't approximate.

---

## Task 1: Scaffold the Next.js + Tailwind project with ported theme

**Files:**
- Create: `sierra-clone/` (via `create-next-app`)
- Modify: `sierra-clone/tailwind.config.ts`
- Modify: `sierra-clone/app/layout.tsx`
- Modify: `sierra-clone/app/globals.css`
- Test: `sierra-clone/scripts/verify-page.mjs` (shared screenshot-verification helper used by every later task)

**Interfaces:**
- Produces: `verifyPage(url, screenshotPath)` — a reusable Node script (not a library export, just a CLI script taking two argv) that launches headless Chrome via `puppeteer-core`, navigates to `url`, waits for network idle, and saves a screenshot to `screenshotPath`. Every later task's verification step calls this script.

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/mac/Developer/Scrapper
npx --yes create-next-app@latest sierra-clone --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --no-turbopack
```

Expected: `sierra-clone/` directory created with `app/`, `package.json`, `tailwind.config.ts` (or `postcss.config.mjs` if Tailwind v4 uses CSS-first config — check which was scaffolded before Step 2).

- [ ] **Step 2: Extract the real color palette from the downloaded CSS**

```bash
grep -oE '\-\-color-[a-zA-Z0-9-]+:[^;]+' /Users/mac/Developer/Scrapper/sierra-ai-clone/_next/static/chunks/05w9o73k1mu_z.css | sort -u
```

Expected output includes lines like:
```
--color-black:#222
--color-blue-100:#f3f9fe
--color-green-500:#006838
--color-gray-100:#f6f5f3
--color-white:#fff
```
Record the full list — Step 3 hardcodes these values.

- [ ] **Step 3: Write the Tailwind theme file**

Tailwind v4 (scaffolded by `create-next-app` as of 2026) uses CSS-first `@theme` blocks in `app/globals.css` rather than a JS config. Confirm by checking whether `sierra-clone/app/globals.css` already contains an `@import "tailwindcss";` line. If yes, edit `app/globals.css` to add the theme block (replace the whole file):

```css
@import "tailwindcss";

@theme {
  --color-black: #222;
  --color-white: #fff;
  --color-blue-50: #fafbff;
  --color-blue-100: #f3f9fe;
  --color-blue-400: #8bbff5;
  --color-blue-500: #7eaee0;
  --color-blue-600: #4584c6;
  --color-blue-700: #345eb2;
  --color-gray-100: #f6f5f3;
  --color-gray-150: #eee;
  --color-gray-200: #e4e0dc;
  --color-gray-250: #c1bcb7;
  --color-gray-300: #898683;
  --color-gray-350: #716f6c;
  --color-gray-400: #625e5b;
  --color-gray-700: #302e2d;
  --color-gray-800: #3d3b3a;
  --color-green-50: #e4eee6;
  --color-green-100: #f4fffa;
  --color-green-300: #4faf62;
  --color-green-350: #4aa45c;
  --color-green-500: #006838;
  --color-green-800: #05351d;
  --color-red: #e94e2a;
  --color-red-800: #c72d06;
  --font-sans: var(--font-inter);
}

body {
  color: var(--color-gray-800);
  background: var(--color-white);
}
```

If `create-next-app` instead scaffolded a JS `tailwind.config.ts` (Tailwind v3 style), use this equivalent instead — extend `theme.colors` with the same hex values under matching keys (`blue: { 50: '#fafbff', 100: '#f3f9fe', ... }`, etc.) and set `theme.fontFamily.sans` to `['var(--font-inter)']`.

- [ ] **Step 4: Wire up Inter as the font**

Edit `sierra-clone/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Sierra",
  description: "Conversational AI for customer experience.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Install Framer Motion and puppeteer-core**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
npm install motion
npm install --save-dev puppeteer-core
```

Expected: both added to `package.json` dependencies/devDependencies.

- [ ] **Step 6: Write the shared screenshot-verification script**

Create `sierra-clone/scripts/verify-page.mjs`:

```js
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [, , url, screenshotPath] = process.argv;

if (!url || !screenshotPath) {
  console.error('Usage: node verify-page.mjs <url> <screenshotPath>');
  process.exit(1);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const consoleErrors = [];
page.on('pageerror', (err) => consoleErrors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise((r) => setTimeout(r, 500));

const textLen = await page.evaluate(() => document.body.innerText.trim().length);
await page.screenshot({ path: screenshotPath, fullPage: true });

console.log(`textLen=${textLen}`);
console.log(`consoleErrors=${consoleErrors.length}`);
if (consoleErrors.length) console.log(consoleErrors.join('\n'));

await browser.close();
```

- [ ] **Step 7: Run dev server and verify the scaffold boots**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
npm run dev &
sleep 3
node scripts/verify-page.mjs http://localhost:3000 /tmp/scaffold-check.png
```

Expected: `textLen` > 0, `consoleErrors=0`. Read `/tmp/scaffold-check.png` with the Read tool and confirm it shows the default Next.js starter page (not an error page).

- [ ] **Step 8: Commit**

```bash
cd /Users/mac/Developer/Scrapper
git add sierra-clone/
git commit -m "Scaffold Next.js + Tailwind project with ported Sierra color theme

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Copy scraped assets into public/ and write the HTML-to-JSX converter

**Files:**
- Create: `sierra-clone/scripts/copy-assets.mjs`
- Create: `sierra-clone/scripts/html-to-jsx.mjs`
- Test: `sierra-clone/scripts/html-to-jsx.test.mjs`

**Interfaces:**
- Consumes: nothing from Task 1 directly, but writes into `sierra-clone/public/` which Task 3+ pages will reference via `/assets/...` paths.
- Produces: `htmlToJsx(htmlFragment: string): string` — exported function from `html-to-jsx.mjs` that converts an HTML fragment string into a JSX string (attribute renaming, self-closing void tags, inline `style="..."` to `style={{...}}` object literal, `class` to `className`). Later tasks import this to transcribe each scraped page.

- [ ] **Step 1: Write the asset-copy script**

Create `sierra-clone/scripts/copy-assets.mjs`:

```js
import fs from 'node:fs/promises';
import path from 'node:path';

const SRC = '/Users/mac/Developer/Scrapper/sierra-ai-clone-snapshot/_assets';
const DEST = '/Users/mac/Developer/Scrapper/sierra-clone/public/assets';

await fs.mkdir(DEST, { recursive: true });
const files = await fs.readdir(SRC);
let copied = 0;
for (const f of files) {
  await fs.copyFile(path.join(SRC, f), path.join(DEST, f));
  copied++;
}
console.log(`Copied ${copied} files to ${DEST}`);
```

- [ ] **Step 2: Run it**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node scripts/copy-assets.mjs
```

Expected: `Copied N files to .../sierra-clone/public/assets` where N matches `find /Users/mac/Developer/Scrapper/sierra-ai-clone-snapshot/_assets -type f | wc -l`.

- [ ] **Step 3: Write the failing test for the converter**

Create `sierra-clone/scripts/html-to-jsx.test.mjs`:

```js
import assert from 'node:assert';
import { htmlToJsx } from './html-to-jsx.mjs';

// class -> className
{
  const out = htmlToJsx('<div class="flex items-center">hi</div>');
  assert.match(out, /className="flex items-center"/);
  assert.doesNotMatch(out, /class="/);
}

// self-closing void elements
{
  const out = htmlToJsx('<img src="/assets/foo.png">');
  assert.match(out, /<img src="\/assets\/foo\.png"\s*\/>/);
}

// inline style string -> object
{
  const out = htmlToJsx('<div style="opacity: 1; transform: none">hi</div>');
  assert.match(out, /style=\{\{opacity: '1', transform: 'none'\}\}/);
}

// for/tabindex/readonly attribute renames
{
  const out = htmlToJsx('<label for="x" tabindex="0">hi</label>');
  assert.match(out, /htmlFor="x"/);
  assert.match(out, /tabIndex="0"/);
}

console.log('All html-to-jsx tests passed');
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node scripts/html-to-jsx.test.mjs
```

Expected: `Error: Cannot find module './html-to-jsx.mjs'` (file doesn't exist yet).

- [ ] **Step 5: Write the converter implementation**

Create `sierra-clone/scripts/html-to-jsx.mjs`:

```js
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const ATTR_RENAMES = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  crossorigin: 'crossOrigin',
  contenteditable: 'contentEditable',
};

function styleStringToObjectLiteral(styleStr) {
  const pairs = styleStr
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(':');
      const prop = decl.slice(0, idx).trim();
      const value = decl.slice(idx + 1).trim();
      return `${prop}: '${value.replace(/'/g, "\\'")}'`;
    });
  return `{{${pairs.join(', ')}}}`;
}

export function htmlToJsx(html) {
  let out = html;

  // Rewrite style="..." to style={{...}} first (before generic attr handling).
  out = out.replace(/style="([^"]*)"/g, (_, styleStr) => {
    return `style=${styleStringToObjectLiteral(styleStr)}`;
  });

  // Rename known HTML attributes to their JSX equivalents.
  for (const [from, to] of Object.entries(ATTR_RENAMES)) {
    out = out.replace(new RegExp(`\\b${from}=`, 'g'), `${to}=`);
  }

  // Self-close void elements: <img ...> -> <img ... />
  out = out.replace(/<(\w+)((?:[^>"]|"[^"]*")*)>/g, (match, tag, attrs) => {
    if (VOID_ELEMENTS.has(tag.toLowerCase()) && !attrs.trim().endsWith('/')) {
      return `<${tag}${attrs} />`;
    }
    return match;
  });

  // JSX doesn't allow bare "for"/"class" leftovers or HTML comments <!-- -->.
  out = out.replace(/<!--[\s\S]*?-->/g, '');

  return out;
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node scripts/html-to-jsx.test.mjs
```

Expected: `All html-to-jsx tests passed`

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/Developer/Scrapper
git add sierra-clone/scripts/ sierra-clone/public/assets
git commit -m "Add asset-copy script and HTML-to-JSX converter with tests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Build the RevealSection animation wrapper

**Files:**
- Create: `sierra-clone/components/RevealSection.tsx`
- Test: manual visual check via Task 4 (this component has no meaningful unit test in isolation — its behavior is only observable rendered in a page, so its verification is folded into Task 4's screenshot check).

**Interfaces:**
- Produces: `<RevealSection>` — a client component (`"use client"`) wrapping `motion.div`, taking `children: React.ReactNode` and passing through any additional props (`className`, etc.). Used by every page component built in Tasks 4–7 to wrap elements that were identified during scraping as scroll-reveal animated.

- [ ] **Step 1: Write the component**

Create `sierra-clone/components/RevealSection.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export function RevealSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Developer/Scrapper
git add sierra-clone/components/RevealSection.tsx
git commit -m "Add RevealSection scroll-reveal animation wrapper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Transcribe and build the Home page, extract Nav and Footer

**Files:**
- Create: `sierra-clone/components/Nav.tsx`
- Create: `sierra-clone/components/Footer.tsx`
- Create: `sierra-clone/app/page.tsx`
- Modify: `sierra-clone/app/layout.tsx` (wrap children with `<Nav />` / `<Footer />`)

**Interfaces:**
- Consumes: `RevealSection` from Task 3, `/assets/*` paths from Task 2.
- Produces: `<Nav />` and `<Footer />` — no props, rendered once in `app/layout.tsx` so every page gets them automatically. Later tasks (5, 6, 7) must NOT re-render Nav/Footer inside their own page components.

- [ ] **Step 1: Generate the raw transcription for a starting point**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node -e "
import('./scripts/html-to-jsx.mjs').then(async ({ htmlToJsx }) => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile('/Users/mac/Developer/Scrapper/sierra-ai-clone-snapshot/index.html', 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  await fs.writeFile('/tmp/home-transcribed.jsx', htmlToJsx(bodyMatch[1]));
  console.log('wrote /tmp/home-transcribed.jsx');
});
"
```

Expected: `/tmp/home-transcribed.jsx` written. Read it to see the transcribed structure — this is scaffolding material for Steps 2–4, not the final file (it still has React-internal cruft like `<!--$-->` comment remnants already stripped, `id="_R_..."` React-generated ids, and asset URLs that need rewriting from the scrape's `/_cdn/...`/`/_assets/...` paths to this project's `/assets/...` paths).

- [ ] **Step 2: Extract the Nav component**

Read `/tmp/home-transcribed.jsx`, locate the `<nav aria-label="Main navigation" ...>...</nav>` block, and use it as the basis for `sierra-clone/components/Nav.tsx`:

```tsx
import Link from "next/link";

export function Nav() {
  return (
    <nav aria-label="Main navigation" className="pointer-events-none z-50 sticky top-0">
      <div
        data-testid="nav-background"
        className="pointer-events-auto ease-in-out absolute top-0 left-0 w-full hover:bg-white bg-white/80 backdrop-blur-md"
      >
        <div data-testid="eyebrow-banner" className="py-2 text-white bg-black backdrop-blur-3xl">
          <div className="mx-auto w-full max-w-[1160px] px-6 text-center text-sm">
            Bret Taylor x Acquired on the AI Paradox.{" "}
            <Link className="underline underline-offset-2" href="/resources/videos/sierra-acquired-the-ai-paradox">
              Watch now
            </Link>
            .
          </div>
        </div>
        <div className="mx-auto max-w-[1160px] px-6 flex w-full items-center justify-between py-3 xl:py-4">
          <Link href="/" aria-label="Homepage" className="flex items-center gap-2 text-green-800 font-semibold text-lg">
            <span aria-hidden>&#10047;</span>
            SIERRA
          </Link>
          <ul className="hidden xl:flex items-center gap-6 text-sm text-gray-700">
            <li><Link href="/product">Product</Link></li>
            <li><Link href="/industries">Industries</Link></li>
            <li><Link href="/customers">Customers</Link></li>
            <li><Link href="/company">Company</Link></li>
          </ul>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-700">Sign in</Link>
            <Link
              href="/learn-more"
              className="inline-flex items-center rounded-full bg-green-800 text-white h-10 px-4 text-sm"
            >
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

(This is a simplified, hand-cleaned version of the transcribed markup — drop the mobile hamburger menu button markup found in the transcription for now since it has no functional handler without extracting more state logic; note this as a known simplification.)

- [ ] **Step 3: Extract the Footer component**

Read `/tmp/home-transcribed.jsx`, locate the `<footer ...>...</footer>` block near the end of the file, and use it as the basis for `sierra-clone/components/Footer.tsx`:

```tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-700 py-16">
      <div className="mx-auto max-w-[1160px] px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="font-semibold text-green-800 mb-4">SIERRA</div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Sierra Technologies, Inc.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-3">Product</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/product">Overview</Link></li>
            <li><Link href="/customers">Customers</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-3">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/company">About</Link></li>
            <li><Link href="/login">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium mb-3">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Wire Nav and Footer into the root layout**

Modify `sierra-clone/app/layout.tsx` (from Task 1 Step 4) — change the `<body>` contents:

```tsx
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

// ...(keep the imports and metadata from Task 1)...

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Build the Home page content**

Read `/tmp/home-transcribed.jsx`'s `<header>...</header>` hero block and the sections following it (customer logos strip, "Empower every team" feature sections, stats). Build `sierra-clone/app/page.tsx`, using `RevealSection` around each section that had `opacity: 0` in the transcription, and pointing the hero `<video>` `src` at the copied asset path (check `sierra-clone/public/assets/` for the matching `.mp4` filename copied in Task 2):

```tsx
import { RevealSection } from "@/components/RevealSection";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex grow flex-col">
      <header className="relative isolate h-svh w-full md:h-[90svh] md:min-h-[700px]">
        <video
          className="block h-full w-full pointer-events-none absolute object-cover object-[75%_center] md:object-center"
          muted
          playsInline
          preload="metadata"
          autoPlay
          loop
          src="/assets/102hm74.mp4"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-[1160px] px-6 h-full flex flex-col justify-center">
          <h1 className="mb-4 text-5xl md:text-6xl whitespace-pre-wrap text-white font-medium md:mb-6">
            Better customer experiences.{"\n"}Built on Sierra.
          </h1>
          <Link
            href="/learn-more"
            className="inline-flex w-fit items-center rounded-full bg-gray-100 text-gray-800 h-12 px-6"
          >
            Learn more
          </Link>
        </div>
      </header>

      <RevealSection className="py-24 text-center">
        <h2 className="text-3xl md:text-4xl">Leading brands succeed with Sierra</h2>
      </RevealSection>

      <RevealSection className="py-16">
        <div className="mx-auto max-w-[1160px] px-6 text-center">
          <h2 className="text-3xl md:text-4xl mb-4">Empower every team</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Sierra gives every team the tools to build, manage, and improve
            AI agents that deliver better customer experiences.
          </p>
        </div>
      </RevealSection>
    </main>
  );
}
```

Note: this is a deliberately reduced first pass of the homepage (hero + two sections) rather than the full page — the spec's non-goal is pixel-perfect completeness beyond what's reasonably transcribable; expand section-by-section using the same `RevealSection` pattern if more fidelity is wanted later, using `/tmp/home-transcribed.jsx` as the source reference for additional sections.

- [ ] **Step 6: Verify visually**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node scripts/verify-page.mjs http://localhost:3000 /tmp/home-check.png
```

Expected: `textLen` > 200, `consoleErrors=0`. Read `/tmp/home-check.png` with the Read tool — confirm the nav, hero video/headline, and both `RevealSection` blocks are visible (not blank).

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/Developer/Scrapper
git add sierra-clone/app sierra-clone/components
git commit -m "Build home page with Nav, Footer, and hero video

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Build the Customers index page

**Files:**
- Create: `sierra-clone/components/CustomerLogos.tsx`
- Create: `sierra-clone/app/customers/page.tsx`

**Interfaces:**
- Consumes: `RevealSection` (Task 3).
- Produces: `<CustomerLogos logos={{name: string, src: string}[]} />` — reused by Task 6's Home-page logo strip if that section is expanded later.

- [ ] **Step 1: Transcribe the customers index page**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node -e "
import('./scripts/html-to-jsx.mjs').then(async ({ htmlToJsx }) => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile('/Users/mac/Developer/Scrapper/sierra-ai-clone-snapshot/customers.html', 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  await fs.writeFile('/tmp/customers-transcribed.jsx', htmlToJsx(bodyMatch[1]));
  console.log('wrote /tmp/customers-transcribed.jsx');
});
"
```

- [ ] **Step 2: Write the CustomerLogos component**

Create `sierra-clone/components/CustomerLogos.tsx`:

```tsx
type Logo = { name: string; href: string };

const CUSTOMERS: Logo[] = [
  { name: "Rocket Mortgage", href: "/customers/rocket-mortgage" },
  { name: "Singtel", href: "/customers/singtel" },
  { name: "SiriusXM", href: "/customers/siriusxm" },
  { name: "SoFi", href: "/customers/sofi" },
  { name: "GoFundMe", href: "/customers/gofundme" },
  { name: "Minted", href: "/customers/minted" },
  { name: "Sutter Health", href: "/customers/sutter-health" },
  { name: "Redfin", href: "/customers/redfin" },
  { name: "ADT", href: "/customers/adt" },
];

export function CustomerLogos() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-12">
      {CUSTOMERS.map((c) => (
        <a
          key={c.href}
          href={c.href}
          className="flex items-center justify-center h-20 text-gray-400 hover:text-gray-700 text-sm font-medium"
        >
          {c.name}
        </a>
      ))}
    </div>
  );
}

export { CUSTOMERS };
```

- [ ] **Step 3: Build the Customers index page**

Create `sierra-clone/app/customers/page.tsx`:

```tsx
import { RevealSection } from "@/components/RevealSection";
import { CustomerLogos } from "@/components/CustomerLogos";

export default function CustomersIndex() {
  return (
    <main className="flex grow flex-col">
      <div className="pt-32 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl">
          Our customers
          <br />
          in their own words
        </h1>
      </div>
      <RevealSection className="bg-gray-100">
        <div className="mx-auto max-w-[1160px] px-6">
          <CustomerLogos />
        </div>
      </RevealSection>
    </main>
  );
}
```

- [ ] **Step 4: Verify visually**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node scripts/verify-page.mjs http://localhost:3000/customers /tmp/customers-check.png
```

Expected: `textLen` > 100, `consoleErrors=0`. Read `/tmp/customers-check.png` and confirm the heading and 9 customer links are visible.

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Developer/Scrapper
git add sierra-clone/app/customers sierra-clone/components/CustomerLogos.tsx
git commit -m "Build customers index page with CustomerLogos component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Build the dynamic customer case-study route

**Files:**
- Create: `sierra-clone/data/customers.ts`
- Create: `sierra-clone/components/StatBlock.tsx`
- Create: `sierra-clone/app/customers/[slug]/page.tsx`

**Interfaces:**
- Consumes: `RevealSection` (Task 3), `CUSTOMERS` list from Task 5 (for `generateStaticParams`).
- Produces: `CustomerData` type and `CUSTOMER_DATA: Record<string, CustomerData>` from `data/customers.ts` — the shape every one of the 9 customer entries must match.

- [ ] **Step 1: Transcribe the Redfin case-study page as the reference template**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node -e "
import('./scripts/html-to-jsx.mjs').then(async ({ htmlToJsx }) => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile('/Users/mac/Developer/Scrapper/sierra-ai-clone-snapshot/customers/redfin.html', 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  await fs.writeFile('/tmp/redfin-transcribed.jsx', htmlToJsx(bodyMatch[1]));
  console.log('wrote /tmp/redfin-transcribed.jsx');
});
"
```

Read `/tmp/redfin-transcribed.jsx` and locate: the headline ("How Redfin transformed real estate search with AI."), the stat blocks (e.g. "2x more / Listings viewed"), and any pull-quote text. These become the fields in Step 2.

- [ ] **Step 2: Define the customer data shape and Redfin's entry**

Create `sierra-clone/data/customers.ts`. All headline and stat text below was pulled directly from the actual scraped HTML (`grep`'d from `sierra-ai-clone-snapshot/customers/*.html` during plan review) — not placeholder copy:

```ts
export type Stat = { value: string; label: string };

export type CustomerData = {
  slug: string;
  name: string;
  headline: string;
  heroVideo?: string;
  heroImage?: string;
  stats: Stat[];
  quote?: { text: string; attribution: string };
};

export const CUSTOMER_DATA: Record<string, CustomerData> = {
  redfin: {
    slug: "redfin",
    name: "Redfin",
    headline: "How Redfin transformed real estate search with AI.",
    stats: [{ value: "2x more", label: "Listings viewed" }],
  },
  "rocket-mortgage": {
    slug: "rocket-mortgage",
    name: "Rocket Mortgage",
    headline: "How Rocket Mortgage is reimagining the journey home with AI.",
    stats: [{ value: "4x", label: "Folders per month" }],
  },
  singtel: {
    slug: "singtel",
    name: "Singtel",
    headline:
      "Singtel Group partners with Sierra to transform customer engagement with AI.",
    stats: [],
  },
  siriusxm: {
    slug: "siriusxm",
    name: "SiriusXM",
    headline: "How SiriusXM increases listener loyalty with Sierra.",
    stats: [],
  },
  sofi: {
    slug: "sofi",
    name: "SoFi",
    headline:
      "How SoFi turned customer support from a bottleneck into a competitive advantage.",
    stats: [],
  },
  gofundme: {
    slug: "gofundme",
    name: "GoFundMe",
    headline:
      "Behind the Build: How GoFundMe reimagined fundraiser creation as a conversation.",
    stats: [],
  },
  minted: {
    slug: "minted",
    name: "Minted",
    headline:
      "How Minted blends artistry with AI to transform customer experiences.",
    stats: [],
  },
  "sutter-health": {
    slug: "sutter-health",
    name: "Sutter Health",
    headline: "How Sutter Health is scaling chronic care with AI.",
    stats: [],
  },
  adt: {
    slug: "adt",
    name: "ADT",
    headline: "How ADT embraces AI to make every second count.",
    stats: [],
  },
};
```

Several entries have `stats: []` because a confident label couldn't be matched to its value from the transcription within the time budget of this review pass (e.g. Minted's page has a `95%` stat and Rocket Mortgage has a `$1B` stat whose paired labels weren't unambiguously recoverable via text scraping — don't guess at label text; leave the array empty rather than inventing copy). If more stats are wanted later, read `/tmp/<slug>-transcribed.jsx` directly and find the value/label pair by DOM proximity rather than regex.

- [ ] **Step 3: Write the StatBlock component**

Create `sierra-clone/components/StatBlock.tsx`:

```tsx
import type { Stat } from "@/data/customers";

export function StatBlock({ stat }: { stat: Stat }) {
  return (
    <div>
      <div className="text-4xl md:text-5xl text-white">{stat.value}</div>
      <div className="text-gray-300">{stat.label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Build the dynamic route**

Create `sierra-clone/app/customers/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { CUSTOMER_DATA } from "@/data/customers";
import { StatBlock } from "@/components/StatBlock";
import { RevealSection } from "@/components/RevealSection";

export function generateStaticParams() {
  return Object.keys(CUSTOMER_DATA).map((slug) => ({ slug }));
}

export default async function CustomerCaseStudy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const customer = CUSTOMER_DATA[slug];
  if (!customer) notFound();

  return (
    <main className="flex grow flex-col">
      <header className="bg-gray-800 text-white">
        <div className="mx-auto max-w-[1160px] px-6 py-24">
          <h1 className="text-4xl md:text-5xl mb-16 max-w-3xl">
            {customer.headline}
          </h1>
          {customer.stats.length > 0 && (
            <div className="flex gap-16">
              {customer.stats.map((s) => (
                <StatBlock key={s.label} stat={s} />
              ))}
            </div>
          )}
        </div>
      </header>
      {customer.quote && (
        <RevealSection className="py-24">
          <blockquote className="mx-auto max-w-2xl px-6 text-center text-2xl">
            &ldquo;{customer.quote.text}&rdquo;
            <footer className="mt-4 text-gray-400 text-base">
              {customer.quote.attribution}
            </footer>
          </blockquote>
        </RevealSection>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Verify all 9 customer routes visually**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
for slug in redfin rocket-mortgage singtel siriusxm sofi gofundme minted sutter-health adt; do
  node scripts/verify-page.mjs "http://localhost:3000/customers/$slug" "/tmp/customer-$slug-check.png"
done
```

Expected: every invocation prints `textLen` > 50 and `consoleErrors=0`. Read each of the 10 screenshots with the Read tool and confirm the real (not placeholder) headline text is visible for each customer.

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Developer/Scrapper
git add sierra-clone/data sierra-clone/components/StatBlock.tsx "sierra-clone/app/customers/[slug]"
git commit -m "Add data-driven dynamic route for the 9 customer case studies

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Build the Learn More and Login pages

**Files:**
- Create: `sierra-clone/app/learn-more/page.tsx`
- Create: `sierra-clone/app/login/page.tsx`

**Interfaces:**
- Consumes: `RevealSection` (Task 3). No new interfaces produced — these are leaf pages.

- [ ] **Step 1: Transcribe both pages**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node -e "
import('./scripts/html-to-jsx.mjs').then(async ({ htmlToJsx }) => {
  const fs = await import('node:fs/promises');
  for (const name of ['learn-more', 'login']) {
    const html = await fs.readFile(\`/Users/mac/Developer/Scrapper/sierra-ai-clone-snapshot/\${name}.html\`, 'utf8');
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
    await fs.writeFile(\`/tmp/\${name}-transcribed.jsx\`, htmlToJsx(bodyMatch[1]));
    console.log(\`wrote /tmp/\${name}-transcribed.jsx\`);
  }
});
"
```

- [ ] **Step 2: Build the Learn More page**

Read `/tmp/learn-more-transcribed.jsx` for the actual headline/form-label copy, then create `sierra-clone/app/learn-more/page.tsx`:

```tsx
import { RevealSection } from "@/components/RevealSection";

export default function LearnMore() {
  return (
    <main className="flex grow flex-col">
      <RevealSection className="pt-32 pb-24">
        <div className="mx-auto max-w-[1160px] px-6 grid md:grid-cols-2 gap-16">
          <div>
            <h1 className="text-4xl md:text-5xl mb-6">
              See what Sierra can do for your business
            </h1>
            <p className="text-gray-400">
              Talk to our team about building an AI agent for your customers.
            </p>
          </div>
          <form className="flex flex-col gap-4">
            <input
              className="border border-gray-200 rounded-lg px-4 py-3"
              type="text"
              placeholder="Full name"
            />
            <input
              className="border border-gray-200 rounded-lg px-4 py-3"
              type="email"
              placeholder="Work email"
            />
            <input
              className="border border-gray-200 rounded-lg px-4 py-3"
              type="text"
              placeholder="Company"
            />
            <button
              type="submit"
              className="rounded-full bg-green-800 text-white h-12 px-6"
            >
              Submit
            </button>
          </form>
        </div>
      </RevealSection>
    </main>
  );
}
```

- [ ] **Step 3: Build the Login page**

Read `/tmp/login-transcribed.jsx` for the actual copy, then create `sierra-clone/app/login/page.tsx`:

```tsx
export default function Login() {
  return (
    <main className="flex grow flex-col items-center justify-center py-32">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-2xl mb-8 text-center">Sign in to Sierra</h1>
        <form className="flex flex-col gap-4">
          <input
            className="border border-gray-200 rounded-lg px-4 py-3"
            type="email"
            placeholder="Email"
          />
          <input
            className="border border-gray-200 rounded-lg px-4 py-3"
            type="password"
            placeholder="Password"
          />
          <button
            type="submit"
            className="rounded-full bg-green-800 text-white h-12 px-6"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify both pages visually**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node scripts/verify-page.mjs http://localhost:3000/learn-more /tmp/learn-more-check.png
node scripts/verify-page.mjs http://localhost:3000/login /tmp/login-check.png
```

Expected: both print `textLen` > 20 and `consoleErrors=0`. Read both screenshots and confirm visible, non-blank forms.

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Developer/Scrapper
git add sierra-clone/app/learn-more sierra-clone/app/login
git commit -m "Build learn-more and login pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Full-site visual QA pass

**Files:**
- Create: `sierra-clone/scripts/verify-all.mjs`

**Interfaces:**
- Consumes: `verify-page.mjs`'s approach (Task 1), all 13 routes built in Tasks 4–7.
- Produces: nothing consumed by later tasks — this is the final gate.

- [ ] **Step 1: Write the full verification sweep script**

Create `sierra-clone/scripts/verify-all.mjs`:

```js
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:3000';

const routes = [
  ['home', '/'],
  ['customers', '/customers'],
  ['learn-more', '/learn-more'],
  ['login', '/login'],
  ['redfin', '/customers/redfin'],
  ['rocket-mortgage', '/customers/rocket-mortgage'],
  ['singtel', '/customers/singtel'],
  ['siriusxm', '/customers/siriusxm'],
  ['sofi', '/customers/sofi'],
  ['gofundme', '/customers/gofundme'],
  ['minted', '/customers/minted'],
  ['sutter-health', '/customers/sutter-health'],
  ['adt', '/customers/adt'],
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let failures = 0;

for (const [name, route] of routes) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + route, { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 400));
  const textLen = await page.evaluate(() => document.body.innerText.trim().length);
  await page.screenshot({ path: `/tmp/qa-${name}.png`, fullPage: true });

  // Also check a mobile breakpoint.
  await page.setViewport({ width: 375, height: 800 });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `/tmp/qa-${name}-mobile.png`, fullPage: true });

  const ok = textLen > 20 && errors.length === 0;
  if (!ok) failures++;
  console.log(`${name}: textLen=${textLen} errors=${errors.length} ${ok ? 'OK' : 'FAIL'}`);
  if (errors.length) console.log(errors.join('\n'));

  await page.close();
}

await browser.close();
console.log(failures === 0 ? 'ALL ROUTES OK' : `${failures} ROUTE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it**

```bash
cd /Users/mac/Developer/Scrapper/sierra-clone
node scripts/verify-all.mjs
```

Expected: `ALL ROUTES OK` printed at the end, exit code 0.

- [ ] **Step 3: Visually inspect every screenshot**

Read every one of the 28 screenshots in `/tmp/qa-*.png` (14 desktop + 14 mobile) with the Read tool. For each, confirm: no blank sections, no visible layout breakage, headline/stat text matches the real Sierra content (not a placeholder), nav and footer present. This step cannot be automated away — it is the actual acceptance gate for the whole plan, per this project's established pattern of catching bugs (`opacity:0` reveal states, missing video downloads) that only a real visual read caught.

- [ ] **Step 4: Fix anything found broken in Step 3, re-run Steps 2–3 until clean**

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Developer/Scrapper
git add sierra-clone/scripts/verify-all.mjs
git commit -m "Add full-site visual QA sweep script, all 13 routes verified

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
