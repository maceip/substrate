# The Four Papers, Actually Read — corrections to our machinery (Jun 12 2026)

All four papers were located, read at the method-section level, and diffed against the
built system. Reference implementations were verified by fetching every repo page.
This supersedes our paraphrases in SESSION.md where they conflict. Verdict up front:
**the machinery is more correct than feared, but we got four specific things wrong —
one per paper — and two of them have committed code mis-tuned to the wrong numbers.**

## Identities (all real)

| ours | actual paper | code? |
|---|---|---|
| MOSS | "MOSS: Self-Evolution through Source-Level Rewriting in Autonomous Agent Systems", arXiv:2605.22794 (May 2026, HKGAI/HKUST) | YES — github.com/hkgai-official/Moss, Apache-2.0, mostly TypeScript + Python daemon |
| AEvo | "Harnessing Agentic Evolution", arXiv:2605.13821 (May 2026, MetaGPT/FoundationAgents group) | NO — official repo is an empty stub (README+LICENSE, 1 commit). Watch the org. |
| Meta-Agent | "Meta-Agent: From Task Descriptions to Verified Multi-Agent Systems", arXiv:2605.25233 (May 2026, Dartmouth) | NO — confirmed code-less. |
| FoT | "Federation over Text: Insight Sharing for Multi-Agent Reasoning", arXiv:2604.16778 (Apr 2026) | YES — github.com/dixiyao/FoT, MIT, Python; algorithm layer (~500 LOC) cleanly separated |
| "Meta hyper agents" (user) | facebookresearch/HyperAgents, arXiv:2603.19461 (Meta FAIR, Mar 2026), 2.6k stars | YES but CC BY-NC-SA — **reference only, cannot vendor**; evaluator deliberately NOT protected (opposite stance) |

## What we got WRONG, per paper

1. **AEvo: the tighten/loosen asymmetry is OUR invention, not the paper's.** AEvo's
   evaluator is symmetric-frozen (agents can't touch it in either direction); there is no
   human-approval channel and no auto-tightening in the paper. Our ratcheting evaluator is
   arguably an ADVANCE over the paper (theirs can never improve), but protect.ts's comment
   calling itself "the missing half of AEvo" is a mis-attribution to fix. What AEvo actually
   contributes that we lack: the META-AGENT LOOP — Φ(progress, repeated failures, costs,
   redundant directions) observed at every boundary, emitting EXACTLY ONE mechanism-edit
   per cycle. Nothing in substrate computes Φ.
2. **FoT: our merge is the paper's WORST baseline.** FoT's core operation is LLM semantic
   consolidation (cluster → connect via typed relationships → synthesize); exact-text dedup
   ≈ their "plain concatenation" control. Also: saturation is ~20 insights (sweet spot),
   not the 50-70 in our notes — our committed warn-at-60 is above the paper's useful zone.
   The cap is not a truncation: library size shrinks via merging (their repo's formula:
   log10-scaled). And distillation fires automatically inside EVERY solve (agent
   self-reflects per task) — our one auto-deposit site inverts the design.
3. **MOSS: the gap is the evidence pipeline, not autonomy.** MOSS promotion is
   user-consent-gated (like ours would be) — our "missing autonomy" framing was off. What
   they have that we lack: the FRONT HALF — failure chunks scanned from session logs by
   cron, scored, weak/missing-only batches sealed at 8, which mechanize "when is there
   enough evidence to rewrite." Plus trial-replay in isolated workers and health-probed
   swap/rollback. Also the paper directly indicts SESSION.md-style prose memory.
4. **Meta-Agent: contracts must be DECLARATIVE DATA, not just tests.** Their io_contracts
   carry schemas + behavioral assertions + forbidden patterns usable by BOTH construction-
   time verification and the runtime attributor. Attribution (LOCAL/UPSTREAM/STRUCTURAL)
   is then a mechanical contract-satisfaction walk up the DAG — no LLM needed for
   local-vs-upstream once edges carry validatable types. Ablation: construction-time
   verification alone is worth +7.1 points. Our ports are TS interfaces (structure only);
   our edges are untyped; tests can't drive attribution.

## Where we are AHEAD of the papers (worth knowing)

- protect.ts is mechanically enforced via git-HEAD baselines — stronger than AEvo's
  unspecified gateway and MOSS's process isolation.
- Our evaluator can ratchet (tighten); AEvo's and MOSS's are frozen.
- HyperAgents (Meta) ships with an explicitly unprotected evaluator; our stance is safer.

## Graft plan (strata rule applied to the metabolism layer)

1. **FoT merge pass — PORT (~500 LOC Python → TS, MIT):** the two merge prompts + JSON
   extraction + log-cap formula replace our dedup/truncation. Highest leverage, smallest.
2. **MOSS evidence pipeline — VENDOR THE PATTERN (Apache-2.0):** failure-chunk batches from
   session/test/gate logs, seal-at-N, then the 7-stage verdict pipeline with trial replay in
   a worktree; promotion = protect.ts-gated commit (our health-probe equivalent), rollback =
   last green commit.
3. **Meta-Agent attribution — IMPLEMENT NATIVE (no code exists):** typed edges first
   (zod schemas on port outputs — Standard Schema work already queued), then the
   enum + DAG-walk classifier on red tests.
4. **AEvo meta-loop — IMPLEMENT NATIVE later (no code exists):** Φ over lens history, gate
   violations, repeat ledger; one meta-action per steward cycle. Builds on 1-3.
5. **HyperAgents — USABLE (user, Jun 12: this is strictly a research endeavor, so NC permits use).** Caveat recorded: BY-NC-SA is share-alike — verbatim-vendored files carry the license forward and constrain any future relicensing; pattern-porting from reading (the Python->TS path we would take anyway) carries no such obligation. Prefer the port.
