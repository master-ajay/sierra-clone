# Development Playbook

**Applies to:** every product we build (Agent SDK, Agent Studio, ADP, Ghostwriter, Insights, Expert Answers, Voice, Guardrails, and anything after).
**Purpose:** the CEO/PM hands down a product-specific spec (goals, requirements, milestones, acceptance criteria) for each product individually. This doc is everything that stays constant across all of them — the process, the roles, and the quality bar. Read this once, pair it with whichever product spec is currently being built, and follow it for every milestone of every product.

---

## PART 1 — How a Product Actually Gets Built (Process)

### The pipeline

```
CEO Vision / Roadmap
     │
     ▼
[1] Product Requirements  ──────  Product Manager      → produces the product spec
     │
     ▼
[2] Technical Design       ──────  Tech Lead / Architect → architecture, data models, API surface
     │
     ▼
[3] Implementation          ──────  Engineers            → code + tests, milestone by milestone
     │
     ▼
[4] Quality Assurance        ──────  QA / Test Engineer   → independent verification
     │
     ▼
[5] Security Review           ──────  Security Engineer    → dedicated adversarial pass
     │
     ▼
[6] Deployment                 ──────  DevOps / SRE          → ships it, keeps it alive
     │
     ▼
[7] Monitoring & Iteration      ──────  All roles, ongoing    → feeds back into the next spec
```

Every stage hands the next one a concrete artifact — a spec, a design doc, code + tests, a pass/fail report — never a verbal understanding.

### Roles and what each one owns

**Product Manager** — turns CEO intent into a precise spec per product: user stories, acceptance criteria, explicit goals *and* non-goals, milestone sequencing. Does not own architecture or code quality.

**Tech Lead / Architect** — turns the spec into a technical design: module boundaries, data models, API contracts, build sequencing, and what's actually risky to build. Does not own product prioritization; technical/product conflicts get escalated, not decided unilaterally.

**Engineers** — implement milestone by milestone, write tests, do the first self-review pass (Part 2 below). Do not own the decision to ship — that needs QA sign-off.

**QA / Test Engineer** — independently re-verifies each milestone against the spec's acceptance criteria, actively trying to break it. This must be a **separate pass from the engineer's own testing**, not a rubber stamp on the same work. Reports failures with reproduction steps; does not fix them.

**Security Engineer** — reviews anything touching user input, external APIs, secrets, or storage. In a lean team this doesn't need a dedicated person, but it does need a dedicated, explicitly-assigned *pass* using the checklist in Part 2 — the risk is skipping the pass, not lacking headcount.

**DevOps / SRE** — owns how the thing runs in production: deployment, config, monitoring, rollback. Does not decide what gets built, only how it ships and stays alive.

**Tech Writer** — README, API docs, anything a future engineer needs without re-reading all the code. Can fold into PM early on.

### Requirement flow (generic template, applies to every product)

1. CEO sets priority: which product, why, roughly what "done" looks like.
2. PM writes the product spec — goals, non-goals, functional requirements, milestones, acceptance criteria.
3. **Gate 1 — CEO approves the spec** before any code is written. This is the cheapest point to catch a wrong direction.
4. Tech Lead adds architecture, data models, API surface (often folded into the same spec document for a lean team).
5. Engineer builds milestone by milestone, applying Part 2 at every single one.
6. QA independently re-verifies against the spec's acceptance criteria — a genuinely separate pass.
7. Security applies the checklist in Part 2.
8. **Gate 2 — CEO reviews the finished product** against the original acceptance criteria before calling it done.
9. DevOps activates once there's something real to deploy.
10. Feedback from production flows back into the next spec (v1.1 or the next product).

### How this compresses on a lean team

| Role | Compressed to | What must never be skipped |
|---|---|---|
| CEO | Founder | The two approval gates |
| PM | Written spec, product by product | A spec before any code, every time |
| Tech Lead | Folded into the spec | Explicit architecture decisions in writing, not implied |
| Engineer | The build agent | The five-pass review panel, actually applied |
| QA | The build agent, but a **separate pass** | Independent re-verification — "I tested it" is not QA |
| Security | The build agent, explicit dedicated pass | The security checklist, actually run, not assumed |
| DevOps | Founder / build agent, once deploying for real | A rollback plan before real users touch it |

The risk on a lean team is never "we don't have enough people" — it's **collapsing separate passes into one and calling it done.** Implementation and QA must be genuinely separate moments even when performed by the same agent, because "did I test my own code" and "does this hold up under adversarial re-testing" are different questions with different answers under time pressure.

### Definition of Ready — before Gate 1
A spec is only worth approving if it's actually complete. Before requesting Gate 1 sign-off, the PM confirms the spec has:
- [ ] Explicit goals *and* explicit non-goals (not just what to build — what NOT to build yet).
- [ ] Acceptance criteria specific enough that "done" is checkable, not a judgment call.
- [ ] Milestones sequenced so each one is independently testable before the next starts.
- [ ] A named tech stack / architecture, not "we'll figure it out during implementation."
- [ ] Explicit open questions flagged, rather than silently assumed one way.

A spec that fails this list isn't ready for Gate 1 — send it back to PM rather than approving it "for now" and hoping gaps get resolved during implementation. Ambiguity approved at Gate 1 is expensive; ambiguity caught before Gate 1 is nearly free.

### Approval gates — where the founder actually needs to show up
- **Gate 1:** spec approval, before code exists. Only after the spec passes Definition of Ready above.
- **Gate 2:** acceptance review, after QA + security passes, before calling it done.

Everything between the gates is delegated. If every commit needs founder review, the gates aren't doing their job.

### Cadence
- **Per milestone:** self-review via the five-pass panel — no founder involvement needed.
- **Per product:** Gate 2 review with the founder.
- **Per roadmap:** revisit priority/sequencing across products.

---

## PART 2 — The Quality Bar (Engineering Standards)

This is what makes "best team in the world" a checklist instead of a vibe. Apply it at **every milestone of every product**, not just once at the end.

### The Review Panel — five passes, applied explicitly and separately

**Pass 1 — Principal Engineer (architecture & correctness)**
- Does this solve the actual problem, or the easiest version of it?
- Correct on the happy path *and* every realistic edge case?
- Do module boundaries from the spec hold, or did logic leak across layers?
- Would this design still make sense several milestones from now, or does it paint the next milestone into a corner?

**Pass 2 — Security Engineer**
- Is any user input, file path, or query used without validation?
- Are secrets ever logged, printed, or returned in a response — even inside an error message?
- Could adversarial input (e.g., prompt injection, if an LLM is involved) manipulate the system's intended behavior?
- Are file/path inputs validated against traversal or injection?

**Pass 3 — QA Lead (test rigor)**
- Unit tests for the happy path *and* at least two realistic failure modes, for every module?
- Tests that deliberately try to break the riskiest logic (not just confirm it works when used correctly)?
- Do tests assert on actual behavior, not just "it didn't crash"?
- Is there an end-to-end test exercising the full flow, not just isolated units?

**Pass 4 — SRE / Reliability**
- What happens when an external call (API, database, model) fails, times out, or returns something malformed?
- What happens on empty/missing input data (empty knowledge base, empty index, missing config)?
- Any unbounded loops, retries, or resource use that could blow up cost or latency on a bad input?
- Is there structured logging at each stage so a real failure can actually be diagnosed later?

**Pass 5 — Readability / Maintainability**
- Could a new engineer understand this in isolation, without reading the whole codebase first?
- Are names accurate and specific, not generic? Any dead code or untracked TODOs left behind?
- Is there a docstring/comment explaining intent on every public function or module?

**Rule:** if a pass surfaces a real issue, fix it before moving on. Don't accumulate "clean up later" debt across milestones — it compounds fast.

### Definition of Done — every milestone, every product
- [ ] All five review passes explicitly applied; issues found were fixed, not just noted.
- [ ] Unit tests cover the happy path and at least two realistic failure modes.
- [ ] Every external call has explicit error handling — no bare/silent exception swallowing.
- [ ] No secrets or sensitive data appear in logs or error output.
- [ ] A docstring or README section explains purpose, inputs, outputs, and failure behavior.
- [ ] Tested against at least one adversarial input (empty, malformed, oversized, or deliberately tricky).
- [ ] Code re-read once, cold, as if reviewing someone else's pull request.

If any box can't be honestly checked, say so explicitly instead of marking the milestone complete.

### Common failure modes to explicitly handle (generic — adapt per product)

| Failure category | Required behavior |
|---|---|
| External API/service fails or times out | Bounded retry (max 2–3 attempts), then a structured error — never a silent empty result |
| Required data/input is missing or empty | Fail clearly or degrade gracefully — never fabricate a plausible-looking result |
| Input is malformed, empty, or adversarial | Reject with a clear validation error before it propagates downstream |
| Two data sources disagree | The system should still produce a sane, explainable result — test this explicitly, don't assume it resolves itself |
| Input is unexpectedly large | Truncate or reject with a clear limit — don't let it silently blow up cost, latency, or memory |
| Concurrent access | Confirm shared state isn't corrupted by simultaneous operations |

### Self-critique loop
Before marking anything done, ask: **"If I were trying to make this fail, what would I try?"** Then actually try it. Confirm the system fails *gracefully* — a clear error, a safe fallback, an escalation — rather than *badly* — a crash, a fabricated answer, a leaked internal error. This is what catches the gaps that your own test list didn't anticipate.

### What "best in the world" does NOT mean
- Not gold-plating a v1 with features outside the current spec's stated scope — non-goals stay non-goals even if they'd be easy to add.
- Not infinite test coverage on trivial code — put rigor where the actual risk is (external calls, user input, anything consequential), not on a getter function.
- Not silently expanding scope because "a senior engineer would also build X." Flag it back to PM/CEO instead of building it unasked.

**"Best team in the world" means rigorous within scope — correct, secure, tested, and honest about what isn't done yet — not maximal scope.**

---

## PART 3 — Cross-Product Consistency Standards

Eight products built separately, over time, by an AI-augmented team will drift apart unless something forces them to stay consistent. A customer (or a future engineer) should be able to move from the Agent SDK to Agent Studio to Insights and feel like it's one platform, not eight prototypes stapled together. These conventions apply to every product from day one:

- **Error format.** Every API returns errors in the same shape: `{"error": {"code": "...", "message": "...", "details": {...}}}`. No product invents its own error envelope.
- **Response schema conventions.** If one product returns a `trace` object for explainability (as the Agent Runtime does), later products that generate or transform data should follow the same pattern rather than inventing a parallel concept with a different name.
- **Naming conventions.** Shared concepts get the same name everywhere — `confidence_score`, not `confidence` in one product and `certainty` in another. Keep a running glossary as products get built; check new specs against it.
- **Versioning.** All REST APIs are versioned the same way (`/v1/...`) from the start, even for internal-only products — retrofitting versioning later is painful.
- **Auth pattern.** Even though early products use a single API key (per their individual non-goals), the *shape* of how auth is passed (header name, token format) should be decided once and reused, so adding real multi-tenant auth later touches one pattern, not eight.

When writing a new product spec, check it against this list before Gate 1 — inconsistency is cheap to fix in a spec and expensive to fix after three products have shipped with a different convention.

---

## PART 4 — Performance & Cost Budgets

LLM-backed products fail in a way traditional software doesn't: they can be "correct" and still be unacceptably slow or unacceptably expensive at scale. Every product spec should state explicit budgets, not leave them implicit:

- **Latency budget.** State a target (e.g., "p95 response time under 3s for the non-streaming endpoint") so a design that technically works but takes 20 seconds gets caught in review, not in production.
- **Cost per request.** Estimate token usage per request (retrieval + generation + any guardrail/judge calls) and flag if a design multiplies LLM calls in a way that could get expensive at volume (e.g., an LLM-as-judge guardrail call on every single response doubles cost per query — that's a fine tradeoff for v1, but it should be a stated, deliberate one, not an accident discovered in a bill later).
- **Retry/backoff cost.** Bounded retries (per Part 2's failure-mode table) should also be sanity-checked against cost — retrying an expensive generation call 3 times on transient failure is a real cost multiplier, not just a reliability nicety.

This doesn't need heavy tooling for early products — a rough estimate in the spec and a sanity check during the SRE review pass (Part 2, Pass 4) is enough until there's real production volume to measure against.

---

## PART 5 — Version Control & Change Management

- **One milestone, one focused commit (or small set of commits).** Don't bundle multiple milestones into one giant commit — it defeats the point of having independently-testable milestones in the first place.
- **Commit messages state what and why**, not just what (`"Add RRF fusion for hybrid retrieval"`, not `"update code"`).
- **No direct edits to a previous milestone's code without a note.** If M3 requires changing something built in M1, say so explicitly rather than silently modifying it — this is exactly the kind of thing that should surface in the Principal Engineer review pass ("would this design still make sense three milestones from now").
- **Tag or note the state of the repo at each Gate 2** (per product), so there's a clear "this is what shipped" marker to roll back to if a later product's changes break something earlier.

---

## PART 6 — Incident Handling (Post-Launch)

Once a product is live (even informally, even just for internal use), things will eventually break. Handle it the same way every time:

1. **Notice.** Logging/monitoring from Part 2's SRE pass should make failures visible, not silent.
2. **Contain.** If a guardrail or escalation path exists, lean on it — degrade to escalation rather than letting a broken path serve bad answers.
3. **Fix.** Root-cause the actual failure, not just the symptom.
4. **Blameless postmortem, in writing, even if it's three sentences:** what broke, why the existing tests/reviews didn't catch it, and what changes in Part 2's checklist (if any) would catch this next time. If a real gap in the review panel or Definition of Done is found, update Part 2 — this playbook should improve as products ship, not stay static forever.

---

## PART 7 — How to Use This With a Product Spec

1. CEO/PM hands down a product-specific spec (goals, non-goals, requirements, milestones, acceptance criteria), checked against Part 3's consistency standards and including Part 4's budgets.
2. Pair it with this playbook — Part 1 governs *who does what and when*, Part 2 governs *how well it has to be done*, Parts 3–6 govern *how it stays consistent, fast, cheap, and recoverable*.
3. Confirm the spec passes Definition of Ready before Gate 1.
4. Build milestone by milestone, per Part 5's version control conventions. Apply Part 2's five-pass panel at the end of every single milestone, not just at the end of the product.
5. After all milestones are complete, report status against the spec's acceptance criteria explicitly — checkbox by checkbox, not a general "looks done."
6. Treat the QA pass as a real, separate gate — a second look, ideally in a fresh session, actively trying to break what was built, before it goes to the founder for Gate 2.
7. If something breaks after launch, follow Part 6 — and feed anything learned back into this playbook.

---

## PART 8 — UI/UX Standards (for any product with a user-facing interface)

Several products in the roadmap have real UI surfaces — Agent Studio's visual builder, Insights' dashboards, Ghostwriter's chat interface, any customer-facing widget. "Fantastic, Sierra-level UI" isn't a vibe either — same as the engineering quality bar, it needs to be a concrete process, or it defaults to a generic admin-panel look.

### Before writing any UI code
Read `/mnt/skills/public/frontend-design/SKILL.md` in full and actually follow its process — brainstorm a design plan (color/type/layout/signature) before writing code, critique that plan against the brief, then build. Skipping straight to code is how UI ends up looking like every other AI-generated dashboard.

### What "fantastic" means for this category of product specifically
This platform is enterprise agent tooling, not a marketing site or a consumer app — the design bar looks different than a landing page:

- **Trustworthy over flashy.** A support manager configuring an agent that talks to real customers needs to feel in control, not delighted by animation. Motion should be purposeful (a state transition, a loading moment) — restraint reads as competence in this category.
- **Data-dense without feeling cluttered.** Insights dashboards, conversation traces, and confidence scores are inherently data-heavy. The signature move here is usually clarity of hierarchy — what's the one number/status that matters most on this screen — not decoration.
- **The trace/explainability data is a design opportunity, not an afterthought.** Sierra's actual gap (per our earlier research) is that its orchestration is a black box. Every screen that shows an agent's reasoning — retrieved sources, confidence score, guardrail pass/fail — should be designed to make that transparency feel like a feature, not a debug log dumped onto the page.
- **Consistent with Part 3's cross-product conventions.** The same type scale, color tokens, and component patterns should carry across every product's UI, so Agent Studio and Insights feel like one platform. Establish the token system once (see below) and reuse it — don't let each product invent its own visual language.

### Process per UI-having product
1. **Brainstorm the design plan first** (per the skill): 4–6 named color tokens, 2+ typefaces with clear roles, a layout concept, and one signature element — before any code.
2. **Ground it in the actual subject.** An agent-builder canvas and a conversation-analytics dashboard are different subjects with different real content — design from what the screen actually needs to show, not a generic template.
3. **Avoid the default AI-design tells** — the skill names three specific clichés (warm-cream-and-terracotta, near-black-with-one-accent, hairline-rule broadsheet) that show up by default unless deliberately avoided. If the design plan lands on one of these without a specific reason tied to this brief, revise it.
4. **Build to the quality floor regardless of aesthetic direction:** responsive down to mobile, visible keyboard focus, reduced-motion respected, real copy (not lorem ipsum) written in the interface's own voice.
5. **Self-critique with actual screenshots**, not just a mental check — render it, look at it, and remove one thing before calling it done (the "look in the mirror, remove one accessory" rule from the skill).
6. **Microcopy follows the same rigor as code.** Buttons say what they do ("Publish agent," not "Submit"). Errors state what happened and how to fix it, in the interface's voice, never vague. The same term for an action carries through the whole flow — including the confirmation state.

### Definition of Done, UI-specific addition
On top of Part 2's general Definition of Done, a UI milestone also needs:
- [ ] Design plan (tokens, layout, signature) reviewed against the brief *before* build, not reverse-justified after.
- [ ] Screenshot self-review completed, at least one thing cut for restraint.
- [ ] Responsive and keyboard-accessible, verified, not assumed.
- [ ] Consistent with the shared token system from prior products (or, if this is the first UI-having product built, establishes the token system that later products will reuse).
- [ ] Copy reviewed for the active-voice, plain-language standard above — no generic SaaS filler ("Unlock the power of...").

---

## Appendix — Reusable Product Spec Template

Use this structure for every new product spec, so all eight end up consistent and nothing gets forgotten:

```
# Product Spec: <Product Name> (v1)

## 1. Problem Statement
## 2. Goals (v1)
## 3. Non-Goals (explicitly out of scope)
## 4. Users
## 5. Functional Requirements
## 6. Technical Architecture
## 7. Tech Stack
## 8. Data Models
## 9. API Surface
## 10. Repo Structure
## 11. Milestones (with "done when" criteria for each)
## 12. Acceptance Criteria (v1 overall)
## 13. Performance & Cost Budgets   <- new, per Part 4
## 14. Consistency Check            <- new, confirm against Part 3's shared conventions
## 15. Environment / Config
## 16. Open Questions
```
