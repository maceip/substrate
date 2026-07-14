# Substrate lifecycle: exact automation contract

Substrate is **not self-updating or autonomous today** in the ordinary meaning of those
words. It contains tested lifecycle primitives and a manually invoked repair pipeline. It
does not install a scheduler, continuously observe projects, merge its own candidates, or
propagate changes without an external actor.

This document separates the intended lifecycle from the current implementation. Do not use
the word "automatic" without one of the qualifiers below.

## Vocabulary

- **Callable:** code exists, but a human or agent must explicitly run it.
- **Event-driven:** code runs inside an already-running project operation, but only at an
  instrumented call site.
- **Scheduled:** an installed OS, CI, or service trigger invokes the code without a person
  remembering. Substrate has no installed scheduler today.
- **Human-gated:** automation may prepare a candidate, but a human must approve the merge.
- **Autonomous:** observation through propagation runs without a human re-driving stages;
  an explicit approval boundary may remain.
- **Self-updating:** Substrate observes evidence, prepares and validates a candidate, waits
  for approval, detects that it landed, and propagates it to eligible projects. Substrate
  does not currently satisfy this definition.
- **Compounding:** a later real project measurably benefits from a lesson or landed repair
  produced by an earlier real project. A cross-process transport proof alone is not evidence
  of compounding benefit.

## Current lifecycle, stage by stage

| Stage | Trigger and actor today | Implementation | Current answer |
|---|---|---|---|
| Observe a failure | An instrumented caller explicitly calls `recordEvidence()`. Existing producers are selected agent-gate failures, failed steward updates, and newly harvested `HANDROLLED` markers. | `blocks/_kernel/evidence.ts`, `blocks/agent-ops/app.ts`, `tools/steward.ts`, `blocks/_kernel/harvest.ts` | **Event-driven at named call sites; not universal observation.** |
| Seal evidence | The eighth recorded chunk for one unit seals a batch during `recordEvidence()`. | `blocks/_kernel/evidence.ts` | **Automatic inside an invoked producer.** |
| Notice due work | A person or agent runs `node tools/steward.ts`; it prints one recommended action. | `tools/steward.ts`, `blocks/_kernel/phi.ts` | **Callable, not scheduled.** |
| Prepare a repair | A person or agent runs `node tools/crispr.ts <unit>`; it creates a worktree and invokes an external coding-agent CLI. | `tools/crispr.ts` | **Callable, not autonomous.** |
| Validate a candidate | The invoked CRISPR run executes the block test suite and ratchet in the worktree. | `tools/crispr.ts`, `blocks/_kernel/protect.ts` | **Automatic inside that run; not independent validation.** |
| Publish pending state | A green trial records the candidate commit and leaves its evidence and lesson pending. | `tools/crispr.ts`, `tools/crispr-lifecycle.ts` | **Automatic inside an invoked repair run.** |
| Approve and land | A human reviews and merges the candidate without squash or rebase, then explicitly runs `node tools/crispr.ts land <unit>`. The command verifies ancestry before consuming evidence, publishing the lesson, and recording `human-landed`. This v1 path assumes one writer and one uniquely matched evidence batch. | Git, `tools/crispr.ts`, `tools/crispr-lifecycle.ts` | **Human-gated and tracked when explicitly invoked; merge detection is not automatic.** |
| Propagate a landed repair | A person, cron, or agent runs `node tools/steward.ts`, which invokes `blocks/update.ts` for registered projects. No cron or service is installed. | `tools/steward.ts`, `blocks/update.ts` | **Callable, not scheduled.** |
| Respect adoption boundaries | Updates should preserve selective adoption and ejection. Current `update.ts` requires the greenfield `app/` layout and copies every nursery block, so it does not correctly steward adopted or selective repositories. There is no ejection marker. | `blocks/adopt.ts`, `blocks/update.ts` | **No.** |
| Consolidate lessons | A person or agent runs the consolidation CLI after the steward reports saturation. | `blocks/_kernel/consolidate-cli.ts` | **Callable, not scheduled.** |
| Measure benefit | A steward run invokes the lens snapshot. No controlled causal benchmark exists. The intended user nevertheless created roughly twenty later repositories without choosing Substrate, and the forced pattern-adoption attempt did not retain Substrate as a reusable dependency. | `tools/lens.ts`, `tools/steward.ts`, repository and session history | **The current product failed adoption; the size and causes of its cost are unmeasured.** |

## Binary status

| Question | Answer |
|---|---|
| Do the block tests, declarative contracts, evidence batch sealing, and FoT store work when invoked? | **Yes.** |
| Can the current tools manually produce and test a candidate repair? | **Yes.** |
| Is the supported single-writer promotion path truthful for one uniquely matched evidence batch and an ancestry-preserving merge? | **Yes.** |
| Can the current updater correctly propagate only selected capabilities to adopted repos? | **No.** |
| Is any steward/repair heartbeat installed and running unattended? | **No.** |
| Is Substrate self-updating under the definition above? | **No.** |
| Has cross-project compounding benefit been demonstrated on real adopted projects? | **No.** |
| Did the current product help its intended user enough to be chosen again? | **No.** |

## Current product outcome

The current product is a **failed adoption**, not an unknown outcome. Its creator was also its
target user, knew it existed, built roughly twenty repositories after the initial work, and
did not choose Substrate for them. A forced experiment copied some patterns locally instead
of adopting Substrate, accumulated substantial machinery, and did not establish a reusable
path into the next project. That is strong revealed-preference evidence that the product, in
its current form, cost more than it returned.

A controlled comparison is not required to make that product verdict. It would compare the
same bounded task using normal ecosystem tools against the same task using Substrate. Its
purpose would be diagnostic: quantify the overhead, locate its causes, or test whether a
reduced version can reverse the outcome. It would not retroactively decide whether the
existing product succeeded.

## Repair and redesign hypotheses

These are falsifiable judgments, not neutral placeholders:

1. **Repair-only hypothesis — expected to fail.** Correcting promotion truth, selective
   update, ejection, rollback, and scheduling without changing the adoption surface will not
   materially improve use. Those defects occur after adoption; the observed rejection
   happened before or during entry because the system owned too much, exposed too much
   machinery, mismatched host runtimes, made selection unclear, and delayed its payoff.
2. **Heartbeat-only hypothesis — expected to fail or make matters worse.** Scheduling the
   current steward would make dormant machinery run more often, but would not create useful
   evidence or demand. It risks automating unwanted updates and noise.
3. **Simplification hypothesis — credible.** A much smaller adoption surface, immediate
   value on one bounded need, host-native integration, reversible ownership, and the existing
   compounding lifecycle hidden behind that surface could reverse the adoption result.
4. **Scope-reduction hypothesis — credible but not yet selected.** Reducing what Substrate
   owns while retaining the same lifecycle requirements may make the value legible and the
   integration tolerable. No particular reduced scope has been chosen.
5. **More-machinery hypothesis — expected to fail.** Adding blocks, catalogs, research
   organs, or autonomous stages before simplifying adoption will increase the failure mode
   already observed.

Therefore the next decision is not "repair everything or abandon everything." It is whether
a concrete simplification can make the tool worth choosing. Lifecycle repairs become
valuable only after that adoption hypothesis has a plausible surface.

## Does evolution require other projects?

Other people or external repositories are not logically required. The nursery's own
instrumented failures could supply evidence. But evolution requires both:

1. **Activity that produces evidence.** A dormant nursery and unused blocks have nothing to
   learn from. External projects were intended to provide most of this signal.
2. **An invoker.** Even with sealed evidence, someone or something must run the steward,
   CRISPR, human merge, and steward propagation stages. No installed heartbeat does that.

A scheduler with no real use would only report an idle queue. Real use without a scheduler
would accumulate state but not advance it. The intended system needs both.

## Claim levels

Use these levels instead of the undifferentiated phrase "the mechanism works":

1. **Primitives proven:** isolated data structures and predicates pass tests. **Current: yes.**
2. **Callable loop proven:** an explicitly invoked run can produce and trial a candidate.
   **Current: yes.**
3. **Lifecycle-correct:** pending, merged, landed, propagated, and rolled back are distinct,
   truthful states. **Current: no.**
4. **Unattended human-gated evolution:** an installed heartbeat advances every stage except
   explicit approval. **Current: no.**
5. **Demonstrated compounding:** later real projects measurably benefit. **Current: no.**

The repository may claim only the highest level it has demonstrated.

## Requirements before claiming "self-updating"

- An installed, observable heartbeat with a documented owner and failure reporting.
- Evidence ingestion from every declared participating surface, with provenance.
- Candidate evidence and lessons remain pending until a human merge is detected.
- Propagation respects each project's selected blocks and an explicit ejection boundary.
- Failed rollout is reversible and records rollback evidence.
- At least one unattended, audited cycle completes from real failure through landed repair
  and propagation, with the approval event as the only required human action.
- A later project demonstrates measurable benefit from that landed repair.
