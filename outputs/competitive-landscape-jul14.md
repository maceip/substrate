# Substrate competitive and research landscape — July 14, 2026

## Decision summary

The current Substrate product failed adoption. Repairing its existing lifecycle defects
without changing the entry surface is unlikely to reverse that result. The credible path is
a scope reduction in what a developer must adopt first, while retaining the same larger
capability and evolution requirements behind that smaller surface.

The market has converged on a capability-sized adoption unit: one skill, registry item,
plugin, node, generator, or migration. Successful systems attach that unit to tools developers
already use, deliver bounded value immediately, make ownership unambiguous, and keep updates
explicit and reversible. Systems that attempt broad substrate or control-plane adoption before
demonstrating one recurring benefit show substantially weaker pull.

Substrate should remain a self-improving executable-capability substrate, but a user should
initially encounter one useful capability—not the nursery, catalog, updater, steward, repair
loop, federation store, and protocol as a single adoption decision.

## Method and evidence limits

This review compared public repositories, current documentation, installation paths, update
semantics, and implementation code where lifecycle claims needed verification. Activity and
GitHub stars were checked on July 14, 2026, but are treated only as attention and maintenance
signals, not proof of retained use or developer time saved. Paper benchmark results remain
author-reported unless independently reproduced.

The comparison uses the repository state documented in `LIFECYCLE.md` as the Substrate
baseline:

- executable block primitives and isolated tests exist;
- a manually invoked repair run can create and test a candidate;
- candidate, merged, and landed states are not represented truthfully;
- no scheduler or heartbeat is installed;
- selective adopted-repository updates and ejection are not correct;
- later-project compounding has not been demonstrated;
- the intended user did not retain or voluntarily reuse the product.

## Direct product and distribution comparisons

| System | Smallest useful unit and entry | Update and ownership model | Relevance to Substrate |
|---|---|---|---|
| [shadcn GitHub Registries](https://ui.shadcn.com/docs/registry/github) | One registry item installed from `owner/repo/item`. Items may contain arbitrary source, configuration, tests, workflows, agent rules, conventions, codemods, and migration kits. | Files are copied into the consumer repository. Installation is explicit; source is visible; overwrites and later changes are reviewable. | Reusable project files and one-command distribution are no longer differentiators. Substrate should use or interoperate with this surface rather than recreate it. |
| [Agent Skills](https://github.com/agentskills/agentskills) | One `SKILL.md` folder with optional scripts, references, and assets. Agents discover metadata first and load full content only when relevant. | Skills are portable, version-controlled artifacts supported across agent clients. The standard deliberately does not define learning or promotion. | A skill can be Substrate's discovery and selection wrapper; an executable block remains the implementation and validation unit. This avoids exposing the full catalog to every task. |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | One-line agent installation followed by normal use. The agent can create or edit skills after difficult tasks and corrections. | Skill writes may be staged for approval, but approval and scanning are off by default. Current improvement is primarily model-judged editing; objective evolutionary evaluation remains proposed. | Its strong attention demonstrates the value of low ceremony and immediate usefulness. It does not demonstrate trustworthy validated evolution. |
| [Tessl](https://docs.tessl.io/) | A packaged skill or context artifact installed through a hosted registry. | Authors lint, evaluate, review, version, publish, and update artifacts. Evolution remains publish/evaluate/update rather than automatic learning from ordinary use. | There is market value in lifecycle, evaluation, versioning, and distribution even without genetic language or autonomous mutation. |
| [Backstage Software Templates](https://backstage.io/docs/features/software-templates/) | A reviewed form creates one service or component from a centrally maintained template. | Generated repositories become team-owned. Template changes improve future creation; existing projects are not silently rewritten. | Central platform cost is tolerated when it produces an immediate golden path and then gets out of the team's way. |
| [n8n](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-versioning/) | One node or workflow template. | A saved workflow keeps its existing node version after a new version ships; new workflows receive the newer version. | Capability breadth works when semantic mutation is controlled and the user's composition remains stable. |

### The ownership regimes that hold up

1. **Copied source:** the consumer owns it; upstream does not silently mutate it. Examples:
   shadcn registry items, Backstage templates, and ordinary project templates.
2. **Versioned dependency or runtime:** the publisher owns the implementation; the consumer
   explicitly installs, pins, upgrades, and removes it. Examples: plugins, nodes, packages,
   and MCP servers.
3. **Copied source with recorded origin:** upstream changes arrive only through an explicit
   reconciliation. Copier is the clearest example.

Substrate currently blurs copied-source ownership with a centrally managed update channel.
That ambiguity should be removed rather than automated more aggressively.

## Self-improving and evolutionary systems

| System | What actually improves | Trigger | Validation and promotion reality | Lesson |
|---|---|---|---|---|
| [Microsoft SkillOpt](https://github.com/microsoft/SkillOpt), [paper](https://arxiv.org/abs/2605.23904), [Sleep docs](https://github.com/microsoft/SkillOpt/blob/main/docs/sleep/README.md) | A compact skill document through bounded add/delete/replace edits. | Explicit optimization, or an optional nightly cycle that harvests Codex/Claude transcripts, mines recurring tasks, replays them offline, and consolidates experience. | A candidate must strictly improve held-out validation, best state is preserved, the proposal is staged, and a human runs `adopt`. `schedule` installs a per-project nightly cron entry. | Closest concrete model for Substrate's missing heartbeat and lifecycle truth. Scheduled learning should remain opt-in and produce proposals, not silent mutations. |
| [SkillClaw](https://github.com/AMAP-ML/SkillClaw) | Shared `SKILL.md` files from real session artifacts. | A local API proxy records sessions; an optional evolve server watches local/S3/OSS storage. | Normal publication can write accepted outputs directly. An optional, disabled-by-default validation worker can stage candidates and require thresholds. | It closely matches federation over use, but proxy, daemon, storage, and server setup impose the kind of adoption tax Substrate must avoid. |
| [xskill](https://github.com/SkillNerds/xskill) | Skills routed from atoms extracted from Codex, Claude, Cursor, and other histories. | A local watcher processes session history periodically. | Each skill has Git history; staging receives canary traffic and can be promoted or discarded. The traffic score is itself assigned by an LLM reading conversations, so it is not objective outcome evidence. | Its candidate/staging/landed separation and retained rejected commits are useful; its evaluator should not be copied as sufficient proof. |
| [EvoSkill](https://github.com/sentient-agi/EvoSkill) | Agent prompts and skills from failed trajectories. | Explicit optimization over a supplied task dataset and train/validation split. | Variants are evaluated on held-out tasks and preserved on Git branches; the user selects the winner for deployment. The project explicitly says continuous evolution from ordinary use is not implemented. | Honest evidence that a real ratchet requires a task set, evaluator, and deployment decision. Stronger validation creates higher setup cost. |
| [AutoSkill](https://github.com/ECNU-ICALK/AutoSkill) | Local skills extracted and merged from dialogues and trajectories. | Ordinary sessions can create/version skills; a separate SkillEvo loop evaluates a lineage. | The ordinary writer is not hard-ratcheted. The evaluated champion loop currently does not write winners back to the main SkillBank. | Many systems advertise a continuous loop while their evaluated search and deployed state remain disconnected—the same category of lifecycle gap found in Substrate. |
| [OpenSpace](https://github.com/HKUDS/OpenSpace) | Skills changed after task execution based on analysis and tool-quality signals. | Runs behind normal agent tasks through MCP/CLI integration. | Public validation checks skill directory structure and metadata before updating the registry; it does not visibly replay tasks, run a held-out regression suite, require approval, or enforce rollback before replacement. | A compelling promise and ordinary-use trigger are not enough. Structural validation must not be described as demonstrated improvement. |
| [MetaClaw](https://github.com/aiming-lab/MetaClaw) | Skills and optionally policy behavior derived from captured conversations. | A transparent proxy and optional idle-window training. | Skills-only, RL, and automatic modes exist, but the product remains agent-skill focused rather than an executable application substrate. | Existing-agent attachment makes the feature understandable; a new application runtime is unnecessary at entry. |
| [SkillWiki](https://github.com/Huangdingcheng/SkillWiki), [paper](https://arxiv.org/abs/2606.16523) | Governed skills moving through raw, candidate, draft, verified, released, degraded, deprecated, and archived states. | Explicit commands and proposal review in the public product. | Rich provenance, state, governance, and UI; the installed autonomous scheduler implied by the paper is not clear in the current product. | A comprehensive lifecycle is conceptually close to Substrate but also demonstrates how quickly the control plane becomes the product. |

### Evolution engines, not adoption products

- [GEPA](https://github.com/gepa-ai/gepa) supplies trace-based reflection, pluggable
  evaluators, candidate archives, and best-at-end selection for textual parameters.
- [OpenEvolve](https://github.com/algorithmicsuperintelligence/openevolve) supplies diff/full
  mutation, evaluator contracts, diversity archives, checkpointing, and never-losing-best
  semantics for arbitrary programs or text.
- [EvoAgentX](https://github.com/EvoAgentX/EvoAgentX) and
  [AFlow](https://github.com/FoundationAgents/AFlow) evolve workflow code and prompts over
  explicit datasets.
- [Darwin Godel Machine](https://github.com/jennyzzt/dgm) evolves a coding agent against
  SWE-bench/Polyglot, but is a heavyweight research optimizer rather than developer runtime.

These are potential search backends. Substrate's durable contribution should be the
executable capability contract, evidence bundle, evaluator, ownership boundary, and promotion
protocol—not another mutation algorithm.

## Newer papers that materially change the existing stack

### SkillOpt and SkillOpt-Sleep — May to July 2026

SkillOpt is more directly actionable than a first custom TRACE-style graft. It combines real
trajectory feedback, bounded edits, a strict held-out gate, rejected-edit memory, preserved
best state, a deployable artifact, a nightly transcript-harvest loop, staged proposals, and
explicit adoption. Its benchmark gains are author-reported, but the public lifecycle
implementation is inspectable.

Substrate should borrow the lifecycle shape before writing a new optimizer:

`harvest -> mine recurrence -> replay -> bounded candidate -> held-out gate -> stage -> adopt`

### SkillHone — June 2026

[SkillHone](https://github.com/Tencent/SkillHone),
[paper](https://arxiv.org/abs/2606.08671), treats a full skill folder—`SKILL.md`, scripts,
references, and assets—as an atomic improvement unit. Failures can become issues, changes
become branches or pull requests, and observations become durable decision history. This maps
better to an executable Substrate block than optimizing prose alone. The public implementation
does not yet visibly enforce all of the paper's claimed regression harness, so the architecture
is stronger than the available proof.

### SkillFab — July 2026

[SkillFab](https://skillfab.ai/), [paper](https://arxiv.org/abs/2607.03780), is demand-first:
an unmet capability creates an issue; work proceeds in Git; commit evidence is collected; a
maintainer reviews it; then a versioned skill is published. It is extremely nascent, but its
pull-before-build rule aligns with the lesson from Substrate's unused catalog.

### Agentic Harness Engineering and Meta-Harness — March to April 2026

[Meta-Harness](https://github.com/stanford-iris-lab/meta-harness) preserves full candidate
harnesses and lineages around a frozen model. [Agentic Harness
Engineering](https://github.com/china-qijizhifeng/agentic-harness-engineering) attaches failure
evidence, root cause, predicted task flips, and risk tasks to each change. Both reinforce the
value of evidence-rich immutable candidates, but their public loops have cases where search
and evaluation are not fully isolated or a worse-than-incumbent winner can still be selected.
Substrate must enforce the non-regression boundary in code.

## Safe update precedents

### Nx

[Nx migrations](https://nx.dev/docs/features/automate-updating-dependencies) separate update
generation from execution:

1. update package metadata and write a reviewable `migrations.json` without touching source;
2. let the user inspect or edit the plan;
3. run version-specific migrations;
4. isolate agentic migrations in individual commits;
5. review, skip, or revert changes through normal Git.

This is the strongest model for carrying an improved block into an evolved repository.

### Copier

[Copier](https://copier.readthedocs.io/en/stable/updating/) records template origin and answers,
reconstructs the prior generated state, compares it with local evolution, applies the new
template, and surfaces conflicts for human resolution. It refuses unsafe dirty updates. This
is the clearest precedent for respecting consumer modifications instead of overwriting them.

## Negative and cautionary controls

### Block Protocol

HASH attempted an open standard for arbitrary interoperable blocks and an all-in-one
block-based workspace. In 2023 it [paused work on the open specification and supporting
libraries](https://hash.dev/blog/tech-tree) and extracted the narrower Graph Module/type system
so it could progress without over-indexing on block-specific applications. This does not prove
that every broad substrate must fail, but it is the strongest historical analogue for reducing
the initially exposed scope without abandoning the underlying capabilities.

### Broad new control planes

Projects such as SkillWiki and [Orqenix](https://github.com/milosaysyolo/Orqenix) describe
memory, skills, orchestration, provenance, marketplaces, learning loops, and cross-repository
control in one system. They are young and cannot fairly be declared failures, but their small
current attention relative to low-ceremony skill and registry tools is consistent with
Substrate's mechanism-before-adoption problem.

## Distilled product hypotheses

These are falsifiable judgments rather than unknowns:

1. **Repair-only — expected to fail.** Correcting lifecycle truth, selective updating,
   scheduling, rollback, and ejection without changing entry will not materially improve
   adoption. Most of those features matter after a user has already accepted the system.
2. **More blocks or a new catalog — expected to fail.** shadcn Registry and Agent Skills
   already provide stronger distribution and discovery surfaces. More local catalog machinery
   increases selection and maintenance cost.
3. **Heartbeat-only — expected to fail or add noise.** A scheduler cannot create useful
   evidence from dormant, unused capabilities. It would advance machinery, not demand.
4. **Standards-native capability slice — credible.** One tested executable capability,
   discovered through an Agent Skill and installed as visible consumer-owned files, can lower
   entry cost while retaining the full Substrate lifecycle behind it.
5. **Validated offline evolution after reuse — credible.** Once a capability sees recurring,
   checkable work, a SkillOpt-shaped candidate loop can improve it without placing mutation in
   the live request path.
6. **Federation before single-user value — unlikely.** Cross-project sharing becomes useful
   only after one person's repeated use produces a retained improvement worth sharing.

## Revised execution order

1. Fix only the lifecycle falsehood: evidence and lessons remain pending until the candidate
   is actually merged. Do not claim landed state from a green trial.
2. Freeze new blocks, catalogs, and kernel mechanisms.
3. Select one existing capability because the next real project needs it. Do not invent a
   showcase domain.
4. Expose it through an Agent Skill for discovery and a standard copied-source distribution
   surface, initially a shadcn-compatible GitHub registry item where the file model fits.
5. Run a prospective real-use comparison against the ordinary ecosystem/agent path. Measure
   elapsed time, agent turns, setup failures, cleanup/deletion, and whether the capability is
   retained. This diagnoses the reduced surface; it does not decide whether the old product
   failed.
6. If retained, implement an immutable candidate pipeline:

   `incumbent -> candidate -> validated proposal -> human-adopted block`

   Enforce static and contract checks, focused task evaluation, held-out regression, and
   cost/latency guardrails before staging.
7. Store a candidate evidence bundle: source failures, trajectories, hypothesis, exact diff,
   predicted fixes, risk cohort, evaluator version, split, model, seed, cost, parent, result
   matrix, and explicit accept/reject reason.
8. Use Nx/Copier semantics for downstream proposals: version-specific, dry-runnable,
   diffable, conflict-aware, committed separately, and reversible.
9. Add optional scheduling and cross-project federation only after at least two later real
   projects retain and measurably benefit from the same capability.

Suggested rejection rule: if suitable projects do not voluntarily retain the reduced slice
in at least two of the next three real uses, stop expanding the substrate at this surface.

## Resulting position

Among the reviewed systems, none combines all of these in one demonstrated product:

- ambient evidence from real projects;
- consumer-selectable executable infrastructure capabilities;
- stable ports and declarative contracts;
- hard regression ratchets;
- immutable candidate and lineage storage;
- explicit human promotion;
- conflict-aware propagation to locally evolved repositories;
- cross-project learning.

That combination remains a plausible differentiation. The hypothesis is not that developers
will adopt the whole combination upfront. The hypothesis is that they may adopt one
immediately useful capability whose underlying system can later demonstrate the larger
compounding behavior.
