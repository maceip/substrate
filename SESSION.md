# Project Export — Blocks, Ports, Nursery
*Written to be picked up cold by any agent or by me tomorrow.*
*Status: active design work. We are NOT done shaping what blocks and ports look like.*

---

## The Four Papers (the foundation — read these first)

Four papers published May 2026 form the intellectual backbone of what we're building.
They are not decoration. They are the mechanism that makes this system compound over time
instead of staying a frozen boilerplate.

### 1. MOSS — Self-Evolution through Source-Level Rewriting
**Core claim:** Enforcement and behavior must live in CODE, not in prose docs, memory, or
prompts. Prose drifts. Prose gets ignored under context compression. An entire class of
failure is physically unreachable from the text layer — you cannot prompt your way out of
a structural problem. The fix is source-level: the contract lives in code that runs, and
changes to that code are gated by a protected evaluator the agent being graded cannot edit.

**How it applies here:** Every block's behavior is executable, not described. The interface
a block exposes is the contract. An agent cannot paper over a broken block with a comment.

### 2. AEvo — Harnessing Agentic Evolution
**Core claim:** Don't evolve the OUTPUT — evolve the MECHANISM. A meta-agent observes the
process (candidates, failures, costs, search history) and edits the procedure that controls
future evolution. Critically: the evaluator the agent is graded against is PROTECTED — the
agent can tighten (add failing cases, strengthen checks) but cannot loosen (remove checks,
widen allowlists, downgrade fail-closed to warn). Tightening is automatic; loosening needs
human approval.

**How it applies here:** Agents improve blocks over time by tightening them. The interface
(the port) is protected. Every agent working on any project can strengthen a block; only I
can change what the block fundamentally promises. The system gets better without me
babysitting it.

### 3. Meta-Agent — From Task Descriptions to Verified Multi-Agent Systems
**Core claim:** Decompose a task into a DAG of specialized agents with explicit I/O
contracts and verification criteria at construction time, not just at runtime. Failures
attribute to one of three levels: LOCAL (this agent's output is wrong), UPSTREAM (the
failure came from a dependency), or STRUCTURAL (the decomposition itself is wrong). This
lets recovery be targeted and cheap instead of rebuilding everything.

**How it applies here:** Blocks compose. Each block declares a boundary contract — what it
takes in, what it gives out. When something breaks, you know which block and why. Composing
auth + database + schema is checkable and attributable, not ad-hoc glue.

### 4. FoT — Federation over Text: Insight Sharing for Multi-Agent Reasoning
**Core claim:** Agents solving independent tasks can collectively build a shared, evolving
library of reusable insights by sharing distilled reasoning traces — NOT raw data, NOT code,
just the abstracted lesson. The insight library is merged and capped (not an append-only
log), and it improves performance for future agents even on tasks not involved in building
the library. A weaker model's insights can improve a stronger model's performance.

**How it applies here:** THIS IS THE FLYWHEEL. Every time a block is used in a project and
something is learned (a gotcha, a better pattern, a dead end), that lesson distills into
the block's shared insight store. The next project that pulls the same block inherits that
lesson automatically. Without FoT, the system is identical on day 100 as day 1. With it,
every project is cheaper than the last.

**The test of whether FoT is real:** did a lesson cross a repo boundary without me copying
it by hand? A file you manually edit is not FoT. A lesson that travels automatically is.
FoT only has meaning at ≥2 projects. Project one is the deposit; FoT makes project two
withdraw from it.

---

## The Vision

A **nursery for new projects**: a starting point where the common infrastructure every app
needs is already there as working capability — blocks — each backed by the thinnest real
implementation, swappable for a heavier one later without touching the app code on top.

You describe an idea loosely. You build on the blocks. The expensive plumbing is pre-wired.
Changing it later is a one-place swap, not a rewrite.

**What it is NOT:**
- Not an audit tool. Not a linter. Not a guard framework that scans code and complains.
  (We built this by accident — "strata" — and threw it out. It subtracts instead of adds.)
- Not Scratch or a visual block language. Blocks are INVISIBLE — beneath attention, not
  assembled by hand on a canvas. The expressiveness ceiling of visual block languages is
  real and documented; it is a property of a human standing at the notation composing
  blocks. Remove the human from composition and the ceiling dissolves.
- Not a general-purpose intent compiler. Scope is real infrastructure capabilities, a
  finite set, derived from real repos.

**The freedom principle:**
No schema early is a feature — it lets you move freely in idea space without mental weight.
But absence of structure lets load-bearing guarantees rot (the mixnet failure: "users can't
dial each other directly" had nowhere to live, so an agent routed around it; the stored peer
address destroyed the anonymity guarantee and nobody caught it for days). The nursery
resolves this: structure is pre-installed, you decide nothing early, but the expensive
changes are pre-absorbed so they don't rot later. Batteries included. You don't think about
it until you need to graduate a block.

---

## Blocks and Ports — What We Have So Far, What We Still Don't Know

### What a Block is (settled)
A block is a piece of **working capability** you drop into a project. Not a doc. Not a
schema. Not a contract file. Code that does the thing. You call it; it works.

Examples from the Next.js boilerplate we analyzed (ixartz/Next-js-Boilerplate):

1. HTTP Server — Next.js itself; every request goes through it
2. Auth — Clerk; sign-in/sign-up/session
3. Database — Drizzle + pg pool; one connection, one place
4. Schema — `Schema.ts` + drizzle-kit + `/migrations/`; tables defined once, migrations auto-run
5. Env Validation — t3-env + Zod; fails loud on startup if a secret is missing
6. Structured Logger — logtape; JSON to console in dev, Better Stack in prod
7. Request Guard — Arcjet; shield + bot detection + rate limiting at the middleware layer
8. Input Validation — Zod schemas at every API boundary
9. i18n Routing — next-intl + Crowdin; every route locale-prefixed from day one
10. Error Boundary + Observability — Sentry + Spotlight
11. Form → API Transport — react-hook-form + hookform/resolvers
12. Local Dev DB Socket — pglite-server; postgres-compatible local socket for dev
13. Protected Route Group — `(auth)` layout + middleware route matching
14. CI Pipeline — build + lint + types + unit + Storybook + E2E + visual regression
15. Release / Deploy — semantic-release; automated versioning post-CI
16. Commit Convention — commitlint + lefthook; enforced at pre-commit
17. Dependency Management — Dependabot monthly, grouped minor/patch
18. Design System — Tailwind v4 + Storybook + Chromatic + a11y
19. Middleware Chain — `proxy.ts`; Arcjet → Clerk → i18n composed in one place
20. App Config — `AppConfig.ts`; one source of truth for app-level constants
21. AI Code Review — CodeRabbit; auto-reviews every PR
22. Uptime / Synthetic Monitoring — Checkly; E2E checks post-deployment
23. Coverage Reporting — Codecov; wired into CI
24. Dead Code Detection — Knip; unused deps/exports caught pre-commit and in CI
25. Database Migrations — drizzle-kit; auto-generated, auto-run, versioned

### What a Port is (partially settled, still being shaped)
A port is NOT a capability name. "Auth" is not a port. A port is the **seam where a large
change forces the data/schema to change in a rippling way** — routed through one narrow
chokepoint so the blast radius is contained.

The port is defined by the CHANGE it absorbs, not by the capability it names.

Example: The auth port is not "Clerk." The auth port is the single interface — `getUser()`,
`protect()` — that everything above it calls. When you swap Clerk for Auth.js, that change
passes through the port (one file changes: the adapter), and NOTHING above it changes.
The port is the contract surface. The adapter is the swappable thing behind it.

**What a port looks like in practice (from our Python proof-of-concept):**
```
auth/
  index.ts        ← THE PORT: exports getUser(), protect(), nothing else
  adapters/
    clerk.ts      ← nursery default
    authjs.ts     ← next level
```
App code imports from `auth/index.ts` only. Never from `auth/adapters/clerk.ts`.
Swap the adapter: zero app changes.

**What we still don't know about ports:**
- Is the port list small (a dozen) or a long tail (dozens)? Unknown until we mine the repos.
- The correction made late in session: "auth" is not the port — the port is the seam where
  a change causes large data/schema ripple. We haven't fully worked out what this means for
  every block. Auth was easy to see. Schema, middleware chain, design system — less obvious.
- Graduation: what triggers a block graduating from nursery to next level? We said "organic,
  not asking me" but have not defined the trigger. Candidate: project crossing a usage or
  scale threshold detectable from the code/infra, not requiring a human decision.

### Nursery vs Graduated (partially settled)
Nursery = thinnest real implementation that actually works. Not a stub. Not a mock. Real,
just loose.

Graduated = heavier real implementation behind the SAME interface. App code does not change.

Examples:
- Auth nursery: Clerk (fast, real, works). Graduated: Auth.js, Supabase Auth, roll-your-own.
- Database nursery: pglite (in-memory/file, no server). Graduated: postgres via connection pool.
- Logger nursery: console only. Graduated: Better Stack / Datadog / structured sink.
- CI nursery: build + lint + unit tests. Graduated: E2E, visual regression, synthetic monitoring.

**What we still don't know about graduation:**
- The mechanism is undefined. How does a block know it should graduate? We don't want to
  ask the human. We want it to happen organically. What signal triggers it?
- Who authors the graduated implementation? Is it pre-built (the system ships both nursery
  and graduated impls)? Or is graduation something the agent does when the signal fires?
- Is graduation binary (nursery → graduated) or a spectrum? We discussed grade levels
  (nursery → high school → graduated) but didn't define what each level means or what
  gates the transition.

---

## The Four Papers × The Block Structure

This is the linchpin. A block without the four papers is a frozen boilerplate (create-react-app).
The papers are what make it compound.

```
block/
  index.ts           ← THE PORT (Meta-Agent: boundary contract; AEvo: protected, never loosened by agents)
  adapters/
    nursery.ts       ← thin real impl
    graduated.ts     ← heavy real impl
  insights.md        ← FoT: distilled cross-project lessons, merged not appended, capped
  PROTECTED          ← AEvo: agents may tighten index.ts but cannot loosen it
```

- **MOSS** → behavior in `adapters/*.ts`, not in docs. Executable, not described.
- **AEvo** → `PROTECTED` marks the port (index.ts) as the evaluator. Agents add to adapters,
  strengthen behavior, add cases. They cannot change what the port promises.
- **Meta-Agent** → `index.ts` IS the boundary contract. Compose blocks by wiring their
  index.ts surfaces. Failure attributes: wrong output from this block (local), wrong input
  from upstream block (upstream), wrong wiring (structural).
- **FoT** → `insights.md` accumulates across every project that used this block. Not a log —
  distilled, merged, capped. A lesson from project A is in the store when project B starts.

**What's real when:**
- MOSS + AEvo: real from block #1, project #1.
- Meta-Agent: real when ≥2 blocks compose.
- FoT: real when ≥2 projects use the same block. Project one deposits; project two withdraws.

---

## What We Have Built (artifacts)

- `blocks/py/` — Python proof-of-concept: persistence/auth/http-server ports, a notes app
  built ONLY against the ports, sqlite swap proven with ZERO app-code changes.
- `github_trending_today.{md,json}` — 100 real trending repos, 10 languages × top 10,
  live-scraped from github.com/trending, unauthenticated.
- `NURSERY-BLOCKS-nextjs.md` — 25 blocks derived from ixartz/Next-js-Boilerplate by reading
  the actual code (not guessing). This is the first real block derivation from a real repo.
- `blocks-synthesis.md` — the compiler-adjacency argument: why invisible blocks escape the
  Scratch expressiveness ceiling (the ceiling is a property of a human at the notation;
  remove the human and the ceiling dissolves).

---

## What We Don't Know Yet (be honest, don't pretend)

1. **What a block physically looks like** — we have the Python proof-of-concept and a list
   from the Next.js boilerplate. We do not have a settled answer on what a block IS as a
   filesystem artifact across languages. Still being shaped.

2. **What a port physically looks like** — we have `auth/index.ts → adapters/` as a pattern.
   We have the correction that a port is defined by the change it absorbs, not the capability
   name. We have not applied this to every block in the list. Still being shaped.

3. **Graduation mechanism** — undefined. We know nursery vs graduated is a spectrum not a
   binary. We know graduation should be organic (not asking the human). We do not know what
   triggers it or who authors the graduated impl.

4. **Port catalog size** — is the real port list a dozen or eighty? Empirical question.
   Answer comes from mining the 100 trending repos + my last-8-months repos. Not done yet.

5. **Consumer blocks** — a late insight: the port is few and the blocks that consume each
   port's DATA are many. The 100 repos are most valuable for mapping what real projects
   build ON TOP of each port's output (e.g. "scope query to current user", "gate this route",
   "attribute record to owner" — all consumers of the auth port's output). This is the real
   reuse surface. Not mapped yet.

6. **Cross-language** — a block's code cannot move between languages, only its shape. FoT
   (insight travel) is the reuse mechanism across languages, not code reuse. The implication
   for the block structure across a polyglot repo history is not fully worked out.

---

## Next Steps (in order)

1. ~~Run the port-catalog mining brief.~~ DONE → `outputs/port-catalog-v0.{md,json}`
   (20 ports, cross-tab mine vs OSS, consumer-block map) + `outputs/BLOCK-CATALOG-100.md`
   (38 blocks, frequency-ranked) + `outputs/CROSSCHECK-sample-blocks.md`.

2. ~~Settle what a block physically looks like.~~ DONE → `blocks/persistence/` is the first
   RUNNABLE block and the canonical layout. `blocks/README.md` is the settled vocabulary.
   Runs on Node 24 with zero build step: `node blocks/persistence/demo.ts`.

   **The word-argument is resolved (see blocks/README.md "The five words"):** BLOCK = the
   capability/folder; PORT = the one interface app code imports (the seam, port.ts); GRADE =
   which adapter is behind it; GATE = the executable threshold that forces a grade-up and
   activates requirements; CONSUMER = code built on the port's output. The collision was that
   "port" meant both the interface seam AND the milestone ("when you hit a port"). Now: the
   seam is a PORT, the milestone is a GATE.

3. Build the next blocks by cloning `blocks/persistence/`. IN PROGRESS — built so far (16):
   `persistence`, `env`, `logging`, `transport`, `input-validation`, `request-guard` (the
   last two are BOUNDARY blocks: middleware that plugs into transport's router.use() with no
   cross-import), `async-jobs`, `cache`, `schema-migrations` (wave 1 of catalog-guardrailed
   background builders, Jun 10; schema-migrations feeds persistence's migrations-registered
   requirement), `files`, `ai-model` (wave 2, Jun 10 — ai-model tests run keyless/offline via
   an injectable transport; model pinned per the claude-api reference), `network-privacy`,
   `attestation`, `realtime` (wave 3, Jun 10), `payment`, `i18n` (wave 4, Jun 10).
   NETWORK-PRIVACY CLOSES THE MIXNET WOUND: the port makes peer addresses unrepresentable
   (opaque handles only) and a test deep-scans every port return value against the engine's
   own address table — the guarantee that "had nowhere to live" now has a file, a gate, and a
   test. All runnable + tested. Shared spine in `blocks/_kernel/`. (auth + authz: PUNTED, see
   item 7.)

   CAVEAT ON PRIORITY — payment + i18n were prioritized off the `local_recent` column of
   port-catalog-v0, which is CONTAMINATED (see item 9). On audit, payment's 27/41 is ~4 real
   (and those are x402/ecash, NOT the Stripe-style rail that got built); i18n's 20/41 is ~2
   real. Both are sound NURSERY blocks, but not what the repos actually asked for —
   "generically useful, built correctly, wrongly prioritized." Block SHAPE was still
   guardrailed by the (clean) OSS columns, so the blocks themselves are fine.

4. Wire the four-paper structure into the blocks. ALL FOUR NOW REAL:
   - MOSS (executable, not prose): every gate is a predicate that runs.
   - AEvo (PROTECTED + tighten-not-loosen): ARMED, not honor-system. `_kernel/protect.ts`
     reads each block's gate baseline from `block.json` AS OF GIT HEAD; every block.test.ts
     fails if live gates loosen it. Tightening passes; loosening requires a human commit of
     the loosened baseline — the approval IS the commit. (Before this, assertNoLoosening only
     compared GATES against synthetic mutations of itself — discipline, not enforcement.)
   - Meta-Agent (blocks compose by boundary contracts): `blocks/nursery-app/` composes all six
     blocks into a real notes HTTP service; `nursery-app/project.ts` runs ONE ProjectSignals
     through every block's gate at once (the project-grade dashboard). Composition test in suite.
   - FoT (lesson crosses a repo boundary unaided): PROVEN. `_kernel/fot.ts` is the federation;
     `blocks/fot-proof/` has two independent projects (separate processes, no shared imports);
     `proof.test.ts` shows a persistence lesson travel project-a → federation → project-b with
     zero hand-copying, origin preserved. This was THE open milestone; it is now closed.
     The store's DEFAULT location is now `~/.substrate/fot-store.json` — outside any repo, so
     lessons cross repo boundaries by default (a store inside a repo never could). The two
     insight surfaces are bridged: `npm run insights:sync` renders each block's federated
     lessons into a generated section of its `insights.md`; prose above the markers is curated,
     the section inside them comes from the store. The store is the source of truth.

   FoT hardening DONE (Jun 10): `learn()` now fires from a REAL app event — `blocks/agent-ops/`
   deposits a distilled lesson whenever a contract gate blocks a ship, so the flywheel turns on
   real work, not just the fot-proof lab. `app.test.ts` asserts deposit + recall + dedup; a real
   `node agent-ops/main.ts` accumulated 2 lessons into the federation, rendered into
   agent-gates/insights.md via `insights:sync`. Stores are now accumulated, not seeded. Also
   verified AEvo is genuinely ARMED post-commit: checkProtection returns baseline='commit' and
   catches a real loosening against git HEAD (not just synthetic mutations).

5. Graduation mechanism — now PARTLY defined (was fully open). `gates.ts` answers "what
   triggers a grade-up" (executable thresholds over observed signals) and "what activates"
   (requirements per gate). The SENSOR half now exists: `_kernel/signals.ts` MEASURES signals
   instead of asking for them — writer count from a static call-site scan of the app dir,
   instances/public from declared env (INSTANCES/WEB_CONCURRENCY/PUBLIC_URL), prod from
   NODE_ENV, rows from live store.count(). The dashboard's first row is now measured, not
   hypothetical (`node nursery-app/main.ts`). Honest limits: the scan is an approximation and
   env is declared, not observed infra — better sensors can replace these behind the same
   shape. STILL OPEN: who authors the graduated impl when a gate fires, and whether the
   system auto-swaps the adapter or just reports the under-grade (today it reports).

6. NEW PROJECTS START HERE: `node blocks/create.ts <dir> [name]` stamps a project out of
   the nursery — all blocks under `substrate/`, a starter app on the ports, git-inited with
   an initial commit so AEvo is armed from minute one. FoT VERIFIED WITH A REAL SECOND
   PROJECT (Jun 10): a persistence lesson deposited from this repo was recalled inside a
   freshly scaffolded project via `~/.substrate/fot-store.json`, origin intact, zero
   hand-copying. The flywheel now has two sides: this repo deposits, new projects withdraw.

7. AUTH: PUNTED for now (user decision, Jun 10). Do NOT build the auth block yet, even
   though the architecture PDF lists it as "first thing to build". When it comes back, it
   also unlocks the typed-channel demonstration (auth outputs AuthedUser, consumers take it).

8. `SUBSTRATE-ARCHITECTURE.pdf` is HISTORICAL — a design snapshot from the Python/LangGraph-
   patterns stage (June 6–8). `blocks/README.md` supersedes it on layout, vocabulary, grades,
   gates, and FoT. Do not port things back to Python from it. Still worth extracting from it:
   typed boundary channels (the data crossing between blocks has a declared type), the
   compose-layer rule (exactly one file per app names adapters), tracing + evaluation as
   ports, and the LOCAL → UPSTREAM → STRUCTURAL failure-attribution drill.

9. MINING WAS CONTAMINATED — FIXED (Jun 10). `tools/mine_port_catalog_v1.py` supersedes v0;
   `outputs/port-catalog-v1.{md,json}` is the trustworthy catalog. v0's `local_recent` column
   over-counted three ways, all now corrected: (a) NO DEDUP of clone/fork families — fixed by
   collapsing repos that share a git root-commit or origin remote (41 checkouts → 29 families);
   (b) clones of OTHER people's repos counted as yours — fixed with an OWNERSHIP column
   (`local_own`: origin owner == you, or no remote; 20 of 29 families are actually yours).
   coss (×3) and nym (×3) were clones of cosscom/coss and nymtech/nym — correctly dropped from
   your count; (c) vendored trees (.venv*/site-packages/.build/_next/.min.js/.cache) and
   single-word README/fixture hits — fixed by prefix/suffix exclusion + a QUALIFICATION rule
   (a port counts only with a path/tree hit or ≥2 hits in real code files). Also dropped the
   worst collision tokens (payment's "ledger" = audit/exec logs; i18n's "messages" = protocol
   msgs), and excluded the substrate repo itself (it self-references every block we build).

   THE CLEAN RANKING VALIDATES WAVES 1–3. Your top domain ports by own-repo count are
   attestation (14), async-jobs (13), authorization-policy (13), cache (12), schema-migrations
   (12), ai-model (11), network-privacy (10) — and all except authz are BUILT. The two
   contaminated picks fell to the bottom as expected: payment (7, and its real content is x402
   not Stripe) and i18n (6). Your instinct was right; they were built correctly but ranked on
   noise. Top UNBUILT: release-ci-quality (17, but meta-tooling — deferred by design),
   authorization-policy (13, PUNTED with auth), auth (12, PUNTED).

   TWO TAXONOMY GAPS the catalog STILL cannot see (not contamination — the port list lacks the
   labels, so these get mis-attributed to release-ci/authz/attestation): (i) AGENT-GOVERNANCE
   GATES — your single biggest repo cluster (vet, runcards, cordon, cursor-anchor,
   attested-workload, strata, heart-transplant) is exactly executable-gates-over-agent-output,
   the thing `_kernel/gates.ts` already is; no block exists for it as a capability. (ii) x402
   MICROPAYMENTS — distinct from Stripe billing (HTTP 402 crypto micropayments; tenet,
   local-sphinx, x402-euro-eurd). These two are the real wave-5 candidates, plus authz if auth
   un-punts. Add them to PORTS before the next mine so they surface on their own.

10. BEHAVIORAL SIGNAL — the third evidence source (Jun 10). `tools/mine_shell_history.py` mines
    ~/.zsh_history (what the user RUNS, not what files say) → `outputs/shell-signal.{md,json}`.
    Secret-safe (command tokens only, no values/lines stored). It is the STRONGEST signal and it
    settles the payment/i18n question for good: ZERO `stripe`/`psql`/`redis-cli`/`docker`
    invocations — they were file-content ghosts. Top capabilities by invocation:
    agent-orchestration 195, remote-exec-filesync 131, python-runtime 41, edge-model-runtime 40,
    release-ci-quality 36. The top three with no existing block became WAVE 5 (in flight):
    `agent-gates`, `remote-exec`, `edge-model`.

    NORTH STAR (user, Jun 10): "if we are successful here I shouldn't NEED to be doing as much
    agent interaction." Agent-orchestration is the #1 behavior (195). Success is that number
    FALLING — the nursery + `agent-gates` let agents self-check against executable contracts
    (MOSS/AEvo) instead of the human re-driving them. `agent-gates` is the lever: artifact-gating
    (does this agent output pass the contract?), distinct from _kernel/gates.ts grade-gating.
    Measure progress by reduced manual agent-driving, not by more blocks.

11. BLIND TEST #1 — PASSED (Jun 10). A builder agent was handed the essence of pinback
    (the user's Jun-6 C99 agent-workspace supervisor) as a fresh spec — never told it
    existed — and rebuilt it on the nursery in one session: `/Users/mac/blind-build/workdesk`,
    16/16 e2e checks green over real HTTP + real child processes, including SSE replay→live,
    restart survival, and the snapshot/revert stretch goal. Spec preserved at
    `outputs/blindtest-1-spec.md`. 8 blocks consumed; builder self-reported ~75% of effort on
    domain logic, ~25% plumbing. Four HANDROLLED sites = the honest block-gap list:
    (a) long-lived interactive child process (remote-exec is run-to-completion only),
    (b) streaming/SSE response (transport Res is one-shot JSON — biggest port-rule temptation),
    (c) local directory-tree walk + diff-restore (files does blobs only),
    (d) filesystem-aware validation rules (FieldRule is shape-only).
    Friction fixed in this repo: create.ts stamped a broken test script (agent-ops has no
    block.test.ts — now excluded as the composed app it is). Friction federated: 4 lessons
    deposited FROM workdesk into the FoT store and synced back into transport/
    input-validation/persistence/files insights.md — the first deposits authored by a real
    second project. The validate()-discards-coerced-value trap is now a recorded lesson;
    consider fixing the middleware itself next session.

12. THE STRATA PIVOT (Jun 11, decided by user deferral): NO teardown — but the zero-dependency
    purity is dead. The user's objection landed: "the global open source strata already has all
    those lessons baked in." Evidence: the flywheel's one generic lesson (validate() coercion)
    was a bug Zod solved years ago and existed ONLY because the adapters were hand-rolled; the
    other three workdesk lessons were all about substrate's own seams. NEW RULE: where a mature
    library exists, the adapter WRAPS it — hand-roll only where nothing fits. FoT's claim
    shrinks to its real niche: the LOCAL delta (your invariants, your seams) that no dependency
    or training data can carry.

    Proof executed the same day, using the system's own swap mechanism: input-validation's
    schema-lib adapter (previously a stub that threw) is now real zod and the DEFAULT grade;
    shape-check/detailed remain as dependency-free fallbacks. The port promise HELD — zero
    changes above the port: block suite, nursery-app composition, full suite, and a fresh
    `create.ts` stamp (now npm-installs deps, non-fatal offline) all green. KILL CRITERION: if
    a future adapter swap leaks above its port, the port was a lie and teardown is back on the
    table. NEXT CANDIDATES for ecosystem backing: persistence (better-sqlite3/pglite),
    schema-migrations, transport middleware — same one-block-at-a-time discipline.

    PARKED, deliberately: federated executable cases (_kernel/cases.ts — briefly committed in
    09e894e, deleted in 4abcc64, recoverable via `git show 09e894e:blocks/_kernel/cases.ts`)
    and the CLAUDE.md behavior agreement — both were flywheel machinery
    ahead of need. The discipline problem ("loop turns only when someone deposits/tightens") is
    real but the answer is sensors at seams, not more prose or more kernel — and it waits until
    the strata pivot proves out across 2-3 more blocks. Also still unrun: the CONTROL EXPERIMENT
    (same workdesk spec, no substrate, score against the same 16 e2e checks) — the honest price
    of the whole system is unknown until it runs.

13. THE TWO-LENS CONSTITUTION (Jun 11) — `node tools/lens.ts` is the instrument; run it at
    session end, snapshots accumulate in outputs/lens-history.json.
    LENS 1 — USER (holds veto): agent-orchestration SHARE of shell history (share, not count —
    history is cumulative; baseline 0.1865) + the stamp ledger (~/.substrate/projects.json,
    written automatically by create.ts = revealed preference).
    LENS 2 — PAPERS: the REPEAT RATE — already-solved problems that bite again (a lesson/gate/
    upstream fix existed and didn't protect). All four papers reduce to "never pay twice":
    MOSS kills repeat failures, AEvo kills repeat litigation, Meta-Agent kills repeat diagnosis,
    FoT kills repeat learning. Repeats are recorded by hand (`node tools/lens.ts repeat "..."`)
    until detection can be automated; target is zero. Cost-per-project was REJECTED as the
    metric (user, Jun 11): scale confounds it and three of the four papers apply within a
    single project. Supporting counters: lessons by origin, tightening commits (unprompted-vs-
    asked not yet measurable). RULE: every piece of work declares which lens it serves; a
    mechanism gets one proof artifact, then must show up in lens 1 or stop growing.

13b. GRADES SHARPENED BY THE STRATA PIVOT (Jun 11, settles the "did graduation survive?"
    question): grades measure OPERATIONAL WEIGHT, not code quality. Zod-as-default does not
    violate the nursery — wrapping a free library carries zero operational commitment, so the
    nursery default can BE the best implementation. Graduation keeps its teeth where the
    gradient is operational: persistence (file -> a server you run), logging (console -> a
    paid sink), CI (unit -> E2E infra). A gate fires when measured signals demand a heavier
    operational commitment; its requirements are readiness for that commitment. Where no
    operational gradient exists, grades collapse to one — by design, not failure. Companion
    principle: GATES REPORT, NEVER BLOCK — except invariants the user explicitly declared
    sacred (network-privacy) and contracts an app opts into (agent-gates).

14. THE UPDATE CHANNEL (Jun 11) — `node blocks/update.ts <project-dir>` closes the design
    review's #1 failure (stamp = fork = create-react-app freeze). Safe by construction:
    substrate/ in a stamped project is system-owned, so it is replaced wholesale (preserving
    each block's .data/); unknown dirs are left alone; deps merge; scripts stay project-owned;
    requires a clean git tree; green tests → auto-commit, red → uncommitted + revert command.
    FIRST REAL RUN: workdesk updated across 7 nursery commits — received the validate() fix
    and the zod default, its own 16-check e2e passed untouched (port promise held on a real
    project crossing an adapter swap), committed as workdesk@e906187. The flywheel's missing
    half-turn (fixes flowing BACK to projects) now exists. Design review remaining: FoT
    approval gate (#3, injection channel), port tiering / standard-schema (#2, own session).

15. THE CATALOG — BLOCK REPRESENTATION SETTLED FOR SHIP (Jun 11). `blocks/CATALOG.json` is
    the registry of record: 137 blocks (19 built infra + 118 defined operation cards), one
    schema, three link kinds only (buildsOn = composition, classes = the four invariant-class
    gate library A/B/C/D, evidence = proving repos). `_kernel/check-catalog.ts` runs FIRST in
    npm test (executable schema — names, enums, domain-free ports for operations, resolving
    edges, built-dir consistency, no orphan folders). `CATALOG.md` is generated
    (catalog:render) — edit JSON, never md. RESCUE: the mining session's newest ~46 hole-fill
    ops (Outline/Immich ownership, Discourse/Zulip notifications, Lemmy/Mastodon feed-ranking,
    Postiz scheduling) existed ONLY in its transcript; preserved verbatim in
    outputs/domain-catalog-holefill.md and merged into the catalog. Miner's overlap flag
    preserved: ~4 Postiz scheduler verbs overlap async-jobs. DOOR CLOSED: no new builds this
    release; new DEFINED cards enter only through CATALOG.json + validator.

16. CORPUS CLOSED + SECOND RESCUE (Jun 12). The mining session finished ("corpus closed",
    ~225 mapped ops) but its final five waves (~61 ops) again existed only in its transcript —
    rescued to outputs/domain-catalog-enterprise-raw.md and merged: CATALOG.json now holds
    198 blocks (19 built, 179 defined) across 16 op clusters + infra. First entry in the
    repeat ledger: transcript-only mining output bit twice (known after rescue #1, not
    prevented). Miner's honest unmined gaps: audit/activity-history, moderation/review-queue.
    NOTE: the mining agent has now realized this and is writing its own files to disk — do
    not stomp on or rewrite whatever it produces; reconcile into CATALOG.json via the
    validator instead.

17. PAPERS ACTUALLY READ + AGENTIC LAYER MINED (Jun 12). All four papers located, read,
    and diffed — outputs/four-papers-corrections.md SUPERSEDES this file's paraphrases
    where they conflict. Four corrections: AEvo's tighten/loosen asymmetry is OUR invention
    (paper's evaluator is symmetric-frozen; the meta-agent Φ loop is what we lack); FoT's
    merge is LLM consolidation, not dedup (ours = their worst baseline; saturation ~20 not
    50-70; distill fires per-solve); MOSS's gap is the evidence pipeline not autonomy
    (cron-scanned failure batches sealed at N; promotion is human-gated like ours); Meta-
    Agent contracts are declarative data (schemas + assertions) driving BOTH construction-
    time verification (+7.1 ablation) and mechanical attribution. Graftable code verified:
    dixiyao/FoT (MIT, port ~500 LOC), hkgai-official/Moss (Apache-2.0, pattern+port);
    Meta-Agent + AEvo are code-less (implement native); facebookresearch/HyperAgents is
    CC-NC = reference only. AGENTIC GENETICS BOLSTERED: 30 evidence-anchored agent-task ops
    mined from pinback/vet/runcards/cordon/cursor-anchor (transcript-persistence, process-
    supervision, audited-memory, run-attestation, tamper-evident-log, trajectory-drift,
    resume-handoff, context-cache) — catalog now 245 blocks (19 built, 226 defined). Both
    residual notes from the state-of-the-union are RETIRED (Postiz adjudicated; agentic
    thinness bolstered).

18. CLONEABILITY NORTH STAR (user, Jun 12): another developer must be able to adopt
    substrate without submitting to it — swap components, add their own blocks, modify
    blocks DURABLY. Already true: adapters swap by env var; app code has no framework
    import (ports only); stamps are plain Node/TS; foreign block dirs in substrate/ are
    already preserved by update.ts (unknown-dirs rule); new cards enter via CATALOG.json +
    validator. THE ONE HARD CONFLICT: update.ts replaces nursery-known blocks wholesale, so
    a developer's local modification to a SHIPPED block is destroyed on update. Design
    (not yet built): per-block EJECT marker (substrate/<block>/.ejected) — update skips
    ejected blocks and reports drift instead; eject is the escape hatch that makes the
    system a starting point, not a cage. Rigidity stays only where it is the product
    (PROTECTED/gates INSIDE a block you keep); everything else must be leavable.

19. THE BLOCK PROTOCOL — THE DNA (Jun 12, rubber-meets-road). blocks/PROTOCOL.md is the
    core protocol: 8 conserved segments (S1 seam, S2 graded adapters, S3 executable gates
    on the four bases A-D, S4 the ratchet, S5 federated lessons, S6 evidence-on-failure,
    S7 declarative contracts, S8 registration), EACH paired with its enforcing predicate —
    a segment without a predicate is wishful prose. Everything unnamed is a free region.
    New organs, all tested (kernel.test.ts, wired into the chain after check-catalog +
    check-anatomy): _kernel/evidence.ts (MOSS front half — failure chunks seal at 8 into
    rewrite-queue batches; producers: agent-ops gate-blocks, steward red-updates);
    _kernel/contract.ts (Meta-Agent corrected — declarative PortContract: zod output schema
    + assertions + forbidden patterns + the mechanical attribute() walk: one violated edge
    = upstream, several = structural, none = local); first S7 adoption: input-validation/
    contract.ts. FoT corrected in code: deposit() no longer truncates (accumulate + dedup);
    consolidationDue() flags libraries past the paper's ~20 sweet spot; sync warnings are
    per-block. protect.ts mis-attribution fixed (the ratchet is OURS, beyond AEvo's frozen
    evaluator). Steward now reports both queues (sealed batches = rewrite justified;
    over-sweet-spot = consolidation due). HyperAgents license: research use is fine (user);
    SA caveat recorded — pattern-port, don't vendor verbatim. S7 adoption rule: required
    for every block touched from now on; anatomy check enforces S1-S4 on all 19 today.

20. CLOSED-LOOP V1 (Jun 12). The three remaining metabolism moves landed, all tested:
    (1) S5 CONSOLIDATION — _kernel/consolidate.ts (pure, injectable model; the paper's
    cluster->synthesize merge with the log-cap target; fail-closed: a merge that loses or
    duplicates inputs is REFUSED; provenance survives merging; pre-merge library archived
    to ~/.substrate/consolidations/) + consolidate-cli.ts (real model = `claude -p`;
    `npm run consolidate`). (2) MOSS BACK HALF — tools/crispr.ts: sealed batch -> fresh
    worktree (deps installed, evidence brief committed as preamble) -> pluggable coding
    agent (CODING_AGENT, default claude) -> full-suite trial WITH the ratchet inside ->
    verdict CONVERGED (candidate branch, human-gated merge, evidence consumed) or
    NEED_MORE_WORK (evidence kept; clean teardown). Smoke-tested with a no-op agent —
    which caught and fixed two real bugs (EVIDENCE.md counted as agent work; trial ran
    depless). (3) Φ OBSERVER — _kernel/phi.ts: AEvo's actual contribution; observes lens
    history + repeat ledger + both queues, emits EXACTLY ONE action per steward boundary,
    ranked rewrite > consolidation > repeats > north-star drift > "go build a real
    project"; redundant actions are flagged as their own signal; Φ history in
    ~/.substrate/phi.json. First real observation: "auto-tighten still 0; no mechanism
    work due — spend the next cycle on a real project." THE LOOP NOW CLOSES: failure ->
    evidence -> sealed batch -> crispr -> ratchet-gated candidate -> human merge ->
    steward propagates germline -> lessons consolidate -> Φ names the next move.
    Remaining human gates (by design): crispr promotion, loosening, Φ action execution.

21. S7 COMPLETE — 19/19 CONTRACT COVERAGE (Jun 12). Every built block now carries a
    declarative contract (CONTRACT + SAMPLE in <block>/contract.ts): typed output schema +
    real semantic assertions mined from each port's own promises (persistence version>=1;
    network-privacy's no-dialable-address as a deep-scan forbidden; attestation fail-closed
    valid-iff-claim; payment refund-conservation + no-PAN; agent-gates pass-iff-no-block).
    check-contracts (construction-time, the paper's +7.1 component) runs in the chain after
    anatomy: every contract must load and accept its own SAMPLE. Composition failures in
    nursery-app now machine-attribute via the contract walk (LOCAL/UPSTREAM/STRUCTURAL,
    culprit named). Meta-Agent integration is no longer the weakest — coverage went 1/19 ->
    19/19 in one pass. Only schema-only contract: cache (generic by design; temporal
    guarantees live in its tests). REMAINING WORK ORDERS (mine, no decisions in them): the
    one-log unification (5 stores -> event log + projections), then the web-service starter
    TEMPLATE (the user's on-ramp: negative startup cost, schema invisible until it saves
    you), then full-stack template (pinback pattern: service + thin mobile shells). Native
    Android/iOS nurseries: honest no for now (code does not cross languages; only protocol
    shape + FoT lessons travel).

22. GENESIS LICENSE (user, Jun 12): we are the creators — during the bootstrap era the
    operating agent may modify blocks, ports, and low-level architecture DIRECTLY, without
    waiting for the loop's own ceremony (sealed batches, crispr cycles, demand thresholds).
    The Bitcoin parallel, kept precisely: the genesis block was hand-mined but still a valid
    block in the chain's own format. So hand-mined changes still land IN PROTOCOL FORMAT —
    committed, evidence-linked, lesson-deposited, ratchet-checked — because the steady-state
    machinery inherits this history and must be able to verify it. Genesis is a license to
    skip the queue, never a license to go off-chain. This license RETIRES when the loop
    demonstrates it can carry repairs end-to-end without hand-mining (measure: a few
    consecutive CONVERGED crispr cycles merged with no manual rework).

23. BROWNFIELD-FIRST (user, Jun 12): the most common touchpoint is NOT a fresh stamp — it
    is someone inside an existing repo (their own, a clone of someone else's, a vendor
    boilerplate). Greenfield is the special case. What this changes, concretely:
    (a) ADOPT.TS — the missing sibling of create.ts: vendor substrate INTO an existing repo
    without touching its layout. Requirements from first principles (test 3 will correct
    them): SELECTIVE by default (adopt the blocks the repo lacks, not all 19 — also solves
    the test tax), a substrate.json manifest declaring where app code lives so check-ports/
    harvest scope correctly, MERGE-not-overwrite for AGENTS.md and package.json (namespaced
    scripts: substrate:test), no git init, update channel keyed on .origin.json exactly like
    stamps. (b) THE BROWNFIELD VALUE PROP IS DIFFERENT: a foreign repo already has its ORM,
    logger, server — it will not rip them out for our blocks. What substrate offers brownfield
    is gap-filling blocks (the capabilities the repo LACKS), the federated lessons, the
    AGENTS.md discipline, and eventually contracts/gates wrapped around the repo's OWN seams
    (the ambitious version — not v1). (c) User test 3 (clone OpenClaw + add feature, running
    now) is the first empirical probe; adopt.ts gets built FROM its findings, not before.

    23b. THE ADOPTION BOUNDARY RESOLVED (user + discussion, Jun 12): for anything a repo
    already has (e.g. a database with schema), three relationships exist — REPLACE (never),
    WRAP (their infra as a custom adapter behind our port; opt-in, economical only when
    swap-pressure appears, e.g. an actual DB migration), COEXIST (default: their stuff stays
    native and invisible; substrate supplies only what the repo LACKS). No rectification
    required, ever. "You must use substrate if you're doing substrate" holds PER-CAPABILITY,
    not per-repo: inside an adopted block the protocol is total (ports, ratchet, contracts);
    outside it the predicates do not look. substrate.json IS that boundary. Smallest
    on-ramp: adopt one block, zero blast radius.

24. THE HONEST PRODUCT CLAIM (user, Jun 12). What substrate IS today: "ratcheted reusable
    infrastructure blocks with early compounding machinery." What it is NOT yet: "a Copilot
    that knows what app you want and pulls/wires the right prior blocks automatically." The
    gap is INTELLIGENT SELECTION + WIRING — and it is not a missing brain, it is missing
    AFFORDANCES that let the agent (the intelligence) select well:
      - create.ts stamps ALL 19 blocks (dumb) -> needs SELECTIVE stamping (intent/flag-driven).
      - no adopt.ts (the brownfield selection act) -> designed in brownfield-probes, unbuilt.
      - no intent->block-set MATCHING (the catalog's 246 cards w/ domain-free ports + invariants
        + evidence ARE the recognition corpus; the harvest precedent index IS the 'have we built
        this' lookup; neither is wired into selection yet).
      - no WIRING generation (the starter app is a fixed demo, not intent-shaped).
    The blind test proved the AGENT selects+wires well GIVEN the blocks (workdesk: 8 blocks,
    75% domain effort). So the copilot = agent + these affordances, not a new ML system.
    PRIORITY REORIENT: the selection/wiring layer (selective stamp -> adopt.ts -> intent match)
    is the road to the product claim; strata cleanup (cache/i18n/ai-model) is POLISH, deferred.

    TWO MODES, NOW SEPARATED (the conflation that confused things): IDENTIFY (mine repos + shell
    history → the map of cards the user actually uses; catalog v1 + shell-signal) vs BUILD (agents
    write runnable block code into blocks/; "waves"). The bug was BUILD running ahead of a
    contaminated IDENTIFY, manufacturing payment/i18n. Order is now fixed: identify correctly
    first (behavioral signal), then build only cards with real signal.

    SUNSET CLAUSE (user, Jun 11): the two modes are BOOTSTRAP-ONLY. Mining exists because there
    were no operational blocks to listen to. Once blocks live inside real projects, demand
    signal comes from USAGE — HANDROLLED markers, friction reports, repeats, lessons — which is
    in-grain, in-context, and uncontaminable in the ways the repo mining was. Proof already in
    hand: workdesk's four HANDROLLED sites named the next blocks better than the whole catalog.
    Do not run new mining passes once usage signal flows; retire IDENTIFY as a separate mode.

---

## Credentials to Rotate (written Jun 9 — UNCONFIRMED as of Jun 10; delete this section once done)
- GitHub PAT pasted in chat: github.com/settings/tokens
- GitHub session cookie pasted in chat: github.com/settings/sessions
