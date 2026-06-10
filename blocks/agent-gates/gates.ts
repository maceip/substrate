// gates.ts — THE GRADING / GATING MODEL for agent-gates. [PROTECTED]
//
// This is the SHARED axis every block has: when must this BLOCK grade up? It is NOT the port
// (port.ts), which is this block's whole reason to exist — the ARTIFACT-gate an agent self-checks
// against. Two axes, on purpose: gates.ts grades the BLOCK; the GateSet port grades AGENT OUTPUT.
//
// The first gate fires the moment agents are actually producing the artifacts this block exists to
// check — at that point a runner that silently swallows a thrown predicate, or lets a blocking
// failure through, is worse than no check. The second fires when self-checking is load-bearing in
// production: the registered contract must then be committed and tighten-only (a human approves
// every loosening, by committing it), and every failure must say WHERE it came from so a human is
// pointed at the right place instead of re-driving the agent.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface AgentGateSignals {
  agentEdits: boolean // are agents actually producing the artifacts this block checks
  prod: boolean // self-checks gate work that ships to production (not just a dev convenience)
  gateCount: number // how many gates the app has registered (the contract's surface area)
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: AgentGateSignals
  capabilities: Set<string> // what the current adapter guarantees
  adapterGrade: Grade // current adapter's maxGrade
}

export interface Requirement {
  id: string
  describe: string
  satisfiedBy: (ctx: RequirementContext) => boolean
}

export interface Gate {
  id: string
  from: Grade
  to: Grade
  why: string
  triggered: (s: AgentGateSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const failClosed = cap('fail-closed', 'fail-closed', 'a gate whose check throws counts as a block-level failure with the thrown reason — an exception inside a predicate never silently produces a passing report')
const blockSeverityStops = cap('block-severity-stops', 'block-severity-stops', 'a single block-severity failure forces report.pass=false; a warn is surfaced but never alone fails the report — "pass" means no blocking failure')
const protectedBaseline = cap('protected-baseline', 'protected-baseline', 'the registered gate set is checked against a committed snapshot: a committed gate id cannot be removed or downgraded (block->warn) without a human committing the loosened baseline — tightening is automatic')
const failureAttribution = cap('failure-attribution', 'failure-attribution', 'every failure is labelled local (this artifact broke the contract), upstream (an unmet dependency it did not produce), or structural (the gate itself could not run) — a human is pointed at the right place, not asked to re-drive the agent')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'agents are now producing the artifacts this block checks — a runner that swallows a thrown predicate or lets a blocking failure through is worse than no check, because it reads as "passed"',
    triggered: (s) => s.agentEdits,
    activates: [failClosed, blockSeverityStops],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'self-checks now gate work that ships, or the contract has real surface area — the gate set must be committed and tighten-only (loosening needs a human), and every failure must say where it came from so nobody re-drives the agent blind',
    triggered: (s) => s.prod || s.gateCount > 3,
    activates: [protectedBaseline, failureAttribution],
  },
]

// --- Evaluator -----------------------------------------------------------------------

export interface Unmet {
  gate: string
  requirement: string
  describe: string
}

export interface Evaluation {
  requiredGrade: Grade
  crossed: string[] // gate ids whose threshold is met
  unmet: Unmet[] // activated requirements not yet satisfied
  underGraded: boolean // current adapter cannot reach requiredGrade
  ok: boolean
}

export function evaluate(ctx: RequirementContext, gates: Gate[] = GATES): Evaluation {
  let requiredGrade: Grade = 'nursery'
  const crossed: string[] = []
  const unmet: Unmet[] = []

  for (const gate of gates) {
    if (!gate.triggered(ctx.signals)) continue
    crossed.push(gate.id)
    if (gradeAtLeast(gate.to, requiredGrade)) requiredGrade = gate.to
    for (const req of gate.activates) {
      if (!req.satisfiedBy(ctx)) unmet.push({ gate: gate.id, requirement: req.id, describe: req.describe })
    }
  }

  const underGraded = !gradeAtLeast(ctx.adapterGrade, requiredGrade)
  return { requiredGrade, crossed, unmet, underGraded, ok: unmet.length === 0 && !underGraded }
}

// AEvo protection (assertNoLoosening) is the shared spine primitive, re-exported at the top
// of this file from ../_kernel/grade.ts — written once, used by every block.
