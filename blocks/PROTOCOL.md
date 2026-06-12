# THE BLOCK PROTOCOL — the DNA

DNA is expressive because almost everything may vary, and alive because a small core may not.
This file is the core. Every conserved segment is paired with the PREDICATE that enforces it —
a segment without an enforcing predicate is not protocol, it is wishful prose (MOSS). Everything
not named here is a free region: mutate at will.

The four bases (every gate everywhere instantiates one or more):

| base | name | gate shape |
|---|---|---|
| A | conservation-under-allocation | consumed_once ∧ allocated ≤ available ∧ Σ = total |
| B | fail-closed-verification | verify_against_pinned(x) ∨ reject |
| C | events → reproducible verdict | verdict = f(events ∩ window) |
| D | derived total, one formula | total == formula(parts), recomputed |

## Conserved segments

| # | segment | meaning | enforced by |
|---|---|---|---|
| S1 | THE SEAM | one port (`port.ts`), one import surface (`index.ts`); app code never reaches past it | `_kernel/check-ports.ts` (app side) + `_kernel/check-anatomy.ts` (block side) |
| S2 | GRADED ADAPTERS | implementations live behind the seam, swap by env var, graded by operational weight | `block.json` grades + `check-anatomy.ts` |
| S3 | EXECUTABLE GATES | every guarantee is a predicate (`gates.ts`), classed A–D; gates REPORT, never block (two opt-in exceptions) | the block's own `block.test.ts` + `check-anatomy.ts` |
| S4 | THE RATCHET | gates tighten freely, loosen only via a human commit of the baseline (our extension beyond AEvo's frozen evaluator — owned, no longer mis-attributed) | `_kernel/protect.ts` vs git HEAD |
| S5 | FEDERATED LESSONS | every block deposits/recalls distilled lessons; libraries CONSOLIDATE (merge), never truncate; per-library sweet spot ~20 (FoT, corrected) | `_kernel/fot.ts` + `sync-insights.ts` per-block warnings |
| S6 | EVIDENCE ON FAILURE | a failure anywhere appends a structured evidence chunk; chunks seal into batches that are the rewrite trigger (MOSS evidence pipeline) | `_kernel/evidence.ts` |
| S7 | DECLARATIVE CONTRACT | the port's promises as DATA (schema + assertions + forbidden patterns), readable by construction-time verification AND mechanical attribution (Meta-Agent) | `_kernel/contract.ts` — adoption progressive, required for every block touched from now on |
| S8 | REGISTRATION | a block exists iff it is one validated entry in CATALOG.json with resolving links | `_kernel/check-catalog.ts` (first in npm test) |

## Free regions (mutate at will, the protocol does not care)

Adapter internals · demo.ts · insights.md prose above the markers · extra block-private files
(`_engine.ts`, `messages/`, `schema.ts`) · all app code · which blocks a project keeps ·
ejected blocks (cloneability north star: ejecting a block from the update channel is legal —
the protocol governs blocks you keep on the channel, not blocks you fork).

## Replication, repair, expression (how the segments compose)

- REPLICATION: `create.ts` stamps the genome; `update.ts` propagates germline edits; foreign
  and ejected material is never overwritten.
- REPAIR: S6 evidence batches → (human-gated today) rewrite → S4 ratchet verifies the repair
  cannot loosen → S5 deposits the lesson. This is the CRISPR loop; each organ is a segment.
- EXPRESSION: which grade an adapter runs at is environment (env vars + measured signals via
  gates) — phenotype from genotype + environment, never a code edit.
