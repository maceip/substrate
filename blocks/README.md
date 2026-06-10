# blocks — the nursery

Runnable capability blocks. A new project starts here: the expensive plumbing is already
working, you build on top, and changing it later is a one-place swap instead of a rewrite.

`persistence/` is the canonical shape; `env/`, `logging/`, `transport/`, `input-validation/`,
and `request-guard/` follow it; and `nursery-app/` composes all six into a real notes service.
Run everything:

```sh
npm test       # every block's invariants + the composition test
npm run demo   # every block's demo + the live composed service

# or one at a time:
node persistence/demo.ts                          # default adapter
PERSIST_ADAPTER=memory node persistence/demo.ts   # same app code, different grade
node nursery-app/main.ts                          # 6 blocks composed, + project-grade dashboard
```

No build step, no dependencies — Node 24 runs the TypeScript directly.

## Starting a new project (what the nursery is for)

```sh
node create.ts ~/code/my-app        # or: node create.ts <dir> <name>
cd ~/code/my-app && npm test && npm start
```

The new project gets every block under `substrate/`, a starter app in `app/` built only
against the ports, and an initial git commit so AEvo protection is armed from minute one.
FoT needs no setup: the federation store is `~/.substrate/fot-store.json`, so lessons other
projects deposited are already there — the starter app logs what it inherited at boot.
(Proven end-to-end: a lesson deposited from this repo was recalled inside a freshly
scaffolded project, origin intact, zero hand-copying.)

## Blocks built so far

| block | port (app imports) | nursery → elementary → graduated | gate that escalates |
|---|---|---|---|
| `persistence` | `Store<T>` | memory → file → postgres | writers>1/prod, then instances>1/rows |
| `env` | `load(spec)` | process.env → .env → secret manager | has secrets, then prod secrets |
| `logging` | `Logger` | console → structured JSON → external sink | prod, then instances>1 |
| `transport` | `Router` | node:http → +middleware → framework | public/prod, then instances>1 |
| `input-validation` | `validate(schema)` | shape-check → coercion+errors → schema lib | public/prod, then shared client |
| `request-guard` | `guard(opts)` | memory limiter → sliding+shield → distributed | public, then instances>1 |

`input-validation` and `request-guard` are *boundary* blocks: each exports a middleware that
plugs into `transport`'s `router.use()` — without either block importing the other (structural
compatibility, not coupling). `nursery-app/app.ts` wires the full pipeline: logging → guard →
validation → handler → store.

`nursery-app/` is the composition: `project.ts` runs ONE `ProjectSignals` through every block's
gate at once, so a single description of where the project stands lights up every block's
required grade together (see the dashboard `node nursery-app/main.ts` prints). That is the
Meta-Agent claim made real — blocks compose by their boundary contracts.

## FoT — proven, not just structured (`fot-proof/`)

The flywheel is real and tested. `_kernel/fot.ts` is a federated insight store (merged + capped,
keyed by block). A block re-exports `learn()` / `insights()`. The proof (`npm test` runs it):

```sh
node fot-proof/proof.test.ts
```

`project-a.ts` deposits a distilled persistence lesson; `project-b.ts` — a *separate process*
that never imports project-a — recalls it through the federation. The test asserts the lesson
crossed with its origin intact and that project-b contains no reference to project-a. A lesson
traveled across a repo boundary with zero hand-copying. That is the test of FoT.

---

## The five words (this is what the agents were arguing about)

The argument was real because three different things were sharing one word. Settled here,
each with a one-line test and the file it lives in:

| Word | Is | One-line test | Lives in |
| --- | --- | --- | --- |
| **BLOCK** | a working capability you drop in | "can the app call it and get work done?" | the folder `persistence/` |
| **PORT** | the one narrow interface app code imports; the seam a big change passes through | "does swapping the engine touch app code? if no, the port held" | `port.ts` |
| **GRADE** | which adapter sits behind the port (nursery < elementary < graduated) | "could the app tell which one it's talking to? if no, it's a grade not a feature" | `adapters/*` |
| **GATE** | an executable threshold that, when crossed, forces a grade-up and activates new requirements | "is it a predicate over observed signals, not a human decision?" | `gates.ts` |
| **CONSUMER** | code built on top of a port's output (repository, scoped query, owner attribution) | "does it depend on the port's data, not the engine?" | the app; catalogued in `block.json` |

**The collision that caused the fight:** "port" was being used for *both* the interface seam
*and* the milestone ("when you hit a port…"). Those are now two words. The interface seam is a
**PORT**. The milestone that forces a grade-up is a **GATE**. A port is a place in the code; a
gate is an event in the project's life.

---

## What a block physically is (the canonical layout)

```
persistence/
  index.ts        ← THE ONLY FILE APP CODE IMPORTS. re-exports the port, selects the adapter.
  port.ts         ← THE PORT. the protected boundary contract (Store<T>). [PROTECTED]
  schema.ts       ← THE DATA SHAPE. baseline fields (id/created_at/updated_at/version).
  gates.ts        ← THE GRADING MODEL. thresholds → activated requirements. [PROTECTED]
  adapters/
    memory.ts     ← nursery   grade (in-process; tests / first 5 minutes)
    file.ts       ← elementary grade (durable, dependency-free; the real default)
    graduated.ts  ← graduated grade (postgres + pool; needs a server)
  insights.md     ← FoT. distilled cross-project lessons (merged, capped — not a log).
  block.json      ← machine-readable manifest: port version, grades, gates, consumers.
  PROTECTED       ← AEvo. what agents may tighten but not loosen.
  demo.ts         ← a notes app built ONLY against index.ts. proves the swap + the gates.
  block.test.ts   ← invariants: port invariance, gate escalation, no-loosening.
```

## The four papers, made concrete (why this isn't just a boilerplate)

- **MOSS** — behavior is in `adapters/*.ts` and the gate checks in `gates.ts` are executable
  predicates. Nothing load-bearing lives in prose. The check *runs*.
- **AEvo** — `port.ts` and `gates.ts` are PROTECTED, and the protection is ARMED, not honor-system:
  `_kernel/protect.ts` reads each block's gate baseline from `block.json` AS OF GIT HEAD, and every
  `block.test.ts` fails if the live gates loosen it. Tightening (adding gates/requirements) passes;
  loosening fails until a human commits the loosened baseline — the approval IS the commit.
- **Meta-Agent** — `port.ts` is the boundary contract. Compose blocks by wiring their index.ts
  surfaces; failures attribute to local (this block), upstream (a dependency), or structural.
- **FoT** — lessons live in the federation store (`_kernel/fot.ts`; default `~/.substrate/fot-store.json`,
  outside any repo so lessons cross repo boundaries by default). `fot-proof/` proves the crossing.
  `npm run insights:sync` renders each block's federated lessons into its `insights.md` — the prose
  above the markers is curated; the section inside them is generated from the store.

## How grading works (the part you asked for)

You decide nothing early. The baseline shape (`schema.ts`) and the nursery adapter are already
there. As the project grows, **gates** read observable signals (writer count, instance count,
prod-data, row count) and escalate the *required* grade — organically, without asking you. When
a gate is crossed it **activates requirements**: e.g. the moment data matters in production, a
`version` field and durable writes become mandatory; at multi-instance scale, a connection pool,
registered migrations, and concurrency-safety become mandatory. The evaluator (`checkGrade`)
tells you what's now required and what's unmet. Graduating = pointing the port at a heavier
adapter. The app code does not change.

This is the "elementary-school grading": **nursery → elementary → graduated**, gated by events,
with new requirements switched on at each crossing — exactly when, and not before, you need them.

## Adding the next block

Clone the layout. Keep `index.ts` the only import surface, put the contract in `port.ts`, the
data shape in `schema.ts`, the thresholds in `gates.ts`, mark both protected, and write a demo
that proves the swap. Catalogue its consumers in `block.json`. The 20-port catalog in
`../outputs/port-catalog-v0.md` is the backlog of blocks to build next.
