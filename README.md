# substrate

**Research thesis: infrastructure that compounds. Current product outcome: failed adoption.**

Most starter kits are frozen at the moment you clone them — every project begins at zero and
learns nothing from the last one. substrate is a nursery of working capability **blocks**
(persistence, transport, validation, cache, jobs, gates, ...) behind stable **ports**, wired
to a manually invoked prototype loop intended to make projects improve the system that built
them:

- **Lessons can travel.** Instrumented project code can deposit a lesson into the federated
  store; a later project on the same store can recall it without hand-copying.
- **Fixes can propagate.** After a human merges an upstream repair, an explicitly invoked
  steward run can update compatible stamped projects.
- **Guarantees can't rot.** Every block's promises are executable predicates under a ratchet:
  agents can tighten them freely, and can never loosen them without a human commit.
- **Failures can become repairs.** Instrumented failures accumulate as evidence; enough
  evidence seals a batch; an explicitly invoked repair cycle runs in an isolated worktree,
  trial-gated, and queues a candidate for human merge.

**Automation status:** no scheduler or autonomous heartbeat is installed. The full
candidate-to-merge lifecycle and adopted-repo propagation are not correct yet. See
[`LIFECYCLE.md`](LIFECYCLE.md) for the exact triggers, actors, binary status, and the
requirements that must be met before this repository may claim to be self-updating.

## Quickstart

```sh
# new project (greenfield): small runnable base, armed protection, agent contract included
node blocks/create.ts ~/my-app my-app

# add capabilities when the app actually needs them
node blocks/create.ts ~/my-service my-service --blocks persistence,input-validation,request-guard

# inspect maintenance work; propagation is not safe for selective adopted repos yet
node tools/steward.ts

# the registry: 19 built blocks + 227 evidence-backed capability cards
cat blocks/CATALOG.md
```

For an **existing** repo, the adopt path (lessons-only by default, selective blocks on
request) is the intended entry — see `SESSION.md` items 23–23b for the design status.

## How it's put together

- `blocks/` — the nursery: each block is a folder with one import surface (`index.ts`), a
  protected port, graded adapters (swap by env var, zero app changes), executable gates,
  a declarative contract, and its federated lessons.
- `blocks/PROTOCOL.md` — the DNA: eight conserved segments, each enforced by a predicate
  that runs in the test chain. Everything not named there is a free region.
- `blocks/CATALOG.json` — the registry of record: every block, built or defined, with its
  invariant, its typed port, and the real-world evidence it was mined from.
- `tools/steward.ts` — the duties as code: updates, harvest, lens snapshots, and Φ's single
  recommended action per cycle. Any loop (human, cron, agent) can run it.
- `tools/crispr.ts` — the repair cycle: sealed evidence batch → isolated worktree →
  coding-agent edit → full-suite trial with the ratchet inside → human-gated candidate.
- `outputs/four-papers-map.md` / `outputs/four-papers-corrections.md` — the intellectual
  backbone (MOSS, AEvo, Meta-Agent, FoT — arXiv:2605.22794, 2605.13821, 2605.25233,
  2604.16778), scored honestly against what's built.

## Honest status

This is a research prototype with **failed adoption**. Its intended user created roughly
twenty later repositories without choosing it; no real external repository formally adopted
it; and the forced pattern-adoption experiment did not establish a reusable path into the
next project. Marketing does not explain non-adoption by the tool's own creator.

Nineteen blocks are built and their isolated tests pass; 227 catalog entries are cards, not
code. That proves some primitives, not the product or the full evolution lifecycle. The only
recorded CRISPR candidate was never merged into `main`, even though its evidence was consumed
and a lesson called the repair "landed." No scheduler is installed, the committed repository
and lifecycle stores went dormant after June 12, and adopted-repo propagation is not correct.
The exact binary status is in [`LIFECYCLE.md`](LIFECYCLE.md).
