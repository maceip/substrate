// port.ts — THE PORT for agent-gates. [PROTECTED]
//
// The single narrow interface app code is allowed to import. This block is the substrate-native
// way an agent SELF-CHECKS its own work against contracts that live in CODE (MOSS), not prose —
// so a human does not have to re-drive the agent to find out whether the work is acceptable.
//
// DO NOT CONFUSE THIS WITH gates.ts (the GRADE gate, shared by every block). That axis answers
// "when must this BLOCK grade up?". THIS port is a DIFFERENT axis — ARTIFACT-gating: "does a
// piece of AGENT OUTPUT pass an executable contract?". A GateSet is a set of executable
// predicates the agent runs against an ARTIFACT it produced.
//
// Defined by the CHANGE it absorbs: swapping the in-proc predicate runner for a richer evaluator
// (timeouts, a multi-agent attribution pass, a remote contract service) must pass through here and
// touch NOTHING above it — in particular the Gates an app registered keep working unchanged. App
// code imports from ./index.ts, which re-exports this. App code NEVER imports an adapter directly.
//
// PORT GUARANTEES (these are the contract, not adapter niceties):
//   1. Evaluation is FAIL-CLOSED. A gate whose check() THROWS counts as a 'block'-level failure
//      with the thrown reason — never a silent pass. There is no path where an exception inside a
//      gate produces report.pass=true.
//   2. A single 'block'-severity failure forces report.pass=false. A 'warn'-severity failure is
//      recorded but does NOT by itself make the report fail. "pass" means no blocking failure.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'

// Artifact: an arbitrary object an agent produced. Every field is optional because a gate only
// reads the slices it cares about — a "no TODO in shipped code" gate reads files, an "every
// claim has evidence" gate reads claims. New slices may be ADDED (tightening); none removed.
export interface Artifact {
  files?: { path: string; content: string }[]
  diff?: string
  output?: string
  claims?: Record<string, unknown>
}

// Severity: a 'block' failure stops the report (pass=false); a 'warn' is surfaced but advisory.
export type Severity = 'block' | 'warn'

// GateResult: the verdict of one gate over one artifact. `detail` explains a failure (and is
// REQUIRED in spirit when pass=false, so a human reading the report learns what to fix).
export interface GateResult {
  pass: boolean
  detail?: string
}

// Gate: a named executable predicate with a severity — the contract-in-code an agent self-checks
// against. `describe` is the human-readable contract; `check` is the MOSS half that actually runs.
export interface Gate {
  id: string
  severity: Severity
  describe: string
  check(artifact: Artifact): GateResult
}

// Failure: one gate that did not pass, flattened for a report. `attribution`, when present, is the
// graduated-grade label (see below) explaining WHERE the failure originates.
export interface Failure {
  id: string
  severity: Severity
  detail: string
  attribution?: Attribution
}

// Attribution (Meta-Agent paper): where a failure originates, so a human is pointed at the right
// place instead of re-driving the agent blind.
//   local      — this artifact's own content broke the contract (the agent's own output).
//   upstream   — the artifact relies on something it did not produce (an unmet dependency/claim).
//   structural — the gate itself could not run (it threw): the contract or harness is broken.
export type Attribution = 'local' | 'upstream' | 'structural'

// Report: the result of evaluating an artifact against the whole set. `pass` is false iff there is
// at least one 'block'-severity failure (guarantee 2). `attribution` is present only at grades that
// compute it; absence means "not attributed", never "no failures".
export interface Report {
  pass: boolean
  failures: Failure[]
  attribution?: boolean // true when failures carry an Attribution label (graduated grade)
}

// GateSet: the contract. Every adapter, at every grade, satisfies exactly this. register() adds a
// gate; evaluate() runs every registered gate against an artifact, fail-closed; list() reports the
// registered ids+severities (for a baseline snapshot / tighten-only policy); close() releases any
// resources a richer evaluator might hold.
export interface GateSet {
  register(gate: Gate): void
  evaluate(artifact: Artifact): Report
  list(): { id: string; severity: Severity }[]
  close(): void
}

// Adapter: what each adapter file exports. The port is the SHAPE (GateSet); the adapter is the
// swappable thing behind it. `maxGrade` is the highest grade whose requirements this adapter can
// satisfy; `capabilities` are the named guarantees the GRADE gate evaluator checks against.
// `committedGateIds` (optional) is the protected baseline an elementary+ evaluator refuses to
// loosen — see adapters/elementary.ts.
import type { Grade } from '../_kernel/grade.ts'
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(opts?: { committedGateIds?: { id: string; severity: Severity }[] }): GateSet
}
