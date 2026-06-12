# substrate

**Infrastructure that compounds.**

Most starter kits are frozen at the moment you clone them — every project begins at zero and
learns nothing from the last one. substrate is a nursery of working capability **blocks**
(persistence, transport, validation, cache, jobs, gates, ...) behind stable **ports**, wired
to a loop that makes every project improve the system that built it:

- **Lessons travel.** Anything learned in one project is deposited into a federated store and
  is already there when the next project starts — across repos, automatically.
- **Fixes propagate.** Blocks are repaired upstream once; every project inherits the repair
  through the update channel.
- **Guarantees can't rot.** Every block's promises are executable predicates under a ratchet:
  agents can tighten them freely, and can never loosen them without a human commit.
- **Failures become repairs.** Real failures accumulate as evidence; enough evidence seals a
  batch; a repair cycle runs in an isolated worktree, trial-gated, and queues a candidate for
  human merge.

## Quickstart

```sh
# new project (greenfield): all blocks, armed protection, agent contract included
node blocks/create.ts ~/my-app my-app

# keep every project current with the nursery (and harvest what they learned)
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

This is a research system in its genesis era. 19 blocks are built, tested, and protected;
227 catalog entries are evidence-backed cards, not code. The full loop (failure → evidence →
repair → candidate → propagation) has completed exactly one real revolution. Independent
review verdict: the ratcheted block scaffold is real today; the self-improvement machinery
is correct-but-young. Agents working in this repo: read `AGENTS.md` first — the altitude
rule is there because real tests showed it was needed.
