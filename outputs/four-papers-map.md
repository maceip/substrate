# The Four Papers × What Exists — the integration map (Jun 12 2026)

One-line verdict: **all four papers are integrated as anatomy, almost none yet as metabolism.**
Structure (contracts, protection, transport, predicates) is consistently strong; autonomy
(self-rewriting, self-tightening, self-attributing, self-feeding) is consistently absent.
Every closing move is known and listed at the bottom.

## MOSS — behavior in code, not prose

| | |
|---|---|
| **Lives in** | every `gates.ts` (predicates), all test suites, `check-ports.ts` (port rule as predicate), `check-catalog.ts` (block schema as predicate), `lens.ts` (constitution as instrument), `steward.ts` (duties as code) |
| **Adequate** | the enforcement axiom. Every load-bearing rule violated this month now has a predicate guarding it. Text layer (AGENTS.md) is explicitly distrusted and backed by checks. |
| **Not adequate** | (1) the SELF-EVOLUTION half: no agent rewrites source on its own initiative — every rewrite has been human-occasioned. (2) SESSION.md is still 450+ lines of exactly the drifting prose MOSS warns about. |
| **Score** | enforcement 9/10 · evolution 3/10 |

## AEvo — protected evaluator; tighten automatically, loosen with approval

| | |
|---|---|
| **Lives in** | `PROTECTED` + `block.json` baselines vs git HEAD (`protect.ts`), in every test of every stamped project; armed at first commit by `create.ts`; `assertNoLoosening` |
| **Adequate** | the LOOSENING half — armed, constant, held under pressure once (the blind builder could not loosen its way out of the coercion bug). |
| **Not adequate** | (1) tightening has NEVER fired unprompted — lens counts 0 `[auto-tighten]` commits ever. (2) "loosening needs a human commit" is convention, not mechanism, because agents commit too. |
| **Score** | shield 8/10 · sword 1/10 |

## Meta-Agent — typed decomposition, verification, failure attribution

| | |
|---|---|
| **Lives in** | blocks as DAG nodes, ports as I/O contracts, the compose layer, two-level verification (block suites + composition e2e), and CATALOG.json `buildsOn` — the composition graph as machine-readable data across all 215 blocks |
| **Adequate** | decomposition + contracts. Attribution worked on the one real occasion (coercion 500 → upstream, in minutes, because the seam was explicit). |
| **Not adequate** | (1) nothing labels a red as local/upstream/structural — attribution is whoever reads the failure. (2) construction-time verification of new wiring is just whatever e2e the building agent writes. (3) typed boundary channels (declared types on data crossing blocks) were flagged Jun 10 and never extracted. |
| **Score** | structure 8/10 · automation 2/10 |

## FoT — federated, distilled, merged insight library

| | |
|---|---|
| **Lives in** | `_kernel/fot.ts` (store, dedup, cap, origins), two-directional travel proven, saturation guards sized to the paper's ~50-70 finding (8/block render, warn >60), `insights.md` as committed export riding in every stamp, chokepointed sync, agent-ops auto-deposit, read-back mandated by the stamped agent contract |
| **Adequate** | transport + hygiene — the most paper-faithful of the four. Merge-not-append, cap, distillation, boundary-crossing: all real and exercised. |
| **Not adequate** | (1) the DIET: one automatic deposit site; the mining sessions — the richest learning events so far — deposited nothing. (2) approval gate for the injection channel: queued, unbuilt. (3) lessons inform agents but never execute (federated cases parked, deliberately). (4) federation boundary is one laptop. |
| **Score** | mechanism 8/10 · metabolism 3/10 |

## The closing moves (known, ordered, all small except the last)

1. **Steward heartbeat** — a daily scheduled run (user must arm; it is billed background compute). The Jun-12 discovery lag is the evidence manual cadence fails.
2. **Auto-deposit at more chokepoints** — gate failures, update runs, rescue events. The convention `[auto-tighten]` in commit subjects makes automatic tightening measurable from day one.
3. **FoT approval gate** — deposits land pending; rendering into insights.md requires a commit (approval = the commit).
4. **Attribution labels** — when a composition test fails, emit local/upstream/structural from which level went red.
5. **Self-tightening** — a failure that produces a fix must produce a regression case without a human asking. Furthest out; everything above makes it safe.
