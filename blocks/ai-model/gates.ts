// gates.ts — THE GRADING / GATING MODEL for ai-model. [PROTECTED]
//
// Ladder from the port catalog (`ai-model-provider`, mined from real repos): one provider
// adapter with explicit model config -> multi-provider routing, fallback policy. The first
// gate fires when completions matter (prod, or real daily volume — a transient 429/529
// becomes a certainty, not an edge case); the second when more than one model/provider
// must be reachable, or spend at volume makes a single provider's outage and a single
// undifferentiated bill unacceptable.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface AiSignals {
  prod: boolean // completions are served to real users
  callsPerDay: number // approximate daily completion volume
  costSensitive: boolean // spend is budgeted / tracked per feature
  multiModel: boolean // more than one model/provider must be reachable
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: AiSignals
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
  triggered: (s: AiSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const modelPinned = cap('model-pinned', 'model-pinned', 'requests carry an explicit pinned model id — never a floating alias that can change capability or price under you')
const timeoutRetry = cap('timeout-retry', 'timeout-retry', 'calls are bounded by a timeout and 429/5xx/overloaded answers get a bounded backoff retry — a flaky provider cannot hang the app or fail it on the first blip')
const usageAccounting = cap('usage-accounting', 'usage-accounting', 'input/output tokens are counted at the port, accumulated per process — spend is observable before the invoice')
const fallbackPolicy = cap('fallback-policy', 'fallback-policy', 'an ordered fallback routes to a second provider when the first is down — one provider outage is not the app outage')
const perProviderUsage = cap('per-provider-usage', 'per-provider-usage', 'usage is attributed per provider, so the bill can be split when the routing splits')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'completions now reach real users, or daily volume where a transient 429/529 is a certainty — an unguarded single attempt stops being acceptable',
    triggered: (s) => s.prod || s.callsPerDay > 100,
    activates: [modelPinned, timeoutRetry, usageAccounting],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'more than one model/provider must be reachable, or budgeted spend at volume — a single provider is now an availability AND an accounting liability',
    triggered: (s) => s.multiModel || (s.costSensitive && s.callsPerDay > 10_000),
    activates: [fallbackPolicy, perProviderUsage],
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
