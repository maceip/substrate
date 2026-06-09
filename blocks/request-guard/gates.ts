// gates.ts — grading model for request-guard. [PROTECTED]

import type { Grade } from '../_kernel/grade.ts'
import { gradeAtLeast, higherGrade } from '../_kernel/grade.ts'

export interface GuardSignals {
  public: boolean // reachable by untrusted callers
  instances: number
}

export interface RequirementContext {
  signals: GuardSignals
  capabilities: Set<string>
  adapterGrade: Grade
}
export interface Requirement {
  id: string
  describe: string
  satisfiedBy: (c: RequirementContext) => boolean
}
export interface Gate {
  id: string
  from: Grade
  to: Grade
  why: string
  triggered: (s: GuardSignals) => boolean
  activates: Requirement[]
}

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const rateLimit = cap('rate-limit', 'rate-limit', 'requests are counted per caller and excess is rejected')
const shield = cap('shield', 'shield', 'malformed/oversized requests are rejected before they reach handlers')
const distributed = cap('distributed', 'distributed-limit', 'the quota is shared across instances, not per-process (or a caller multiplies it by instance count)')

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'a public endpoint needs more than counting — reject oversized/malformed ingress too',
    triggered: (s) => s.public,
    activates: [rateLimit, shield],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'per-process counters do not hold across instances — the limit must be shared',
    triggered: (s) => s.instances > 1,
    activates: [distributed],
  },
]

export interface Unmet {
  gate: string
  requirement: string
  describe: string
}
export interface Evaluation {
  requiredGrade: Grade
  crossed: string[]
  unmet: Unmet[]
  underGraded: boolean
  ok: boolean
}

export function evaluate(ctx: RequirementContext, gates: Gate[] = GATES): Evaluation {
  let requiredGrade: Grade = 'nursery'
  const crossed: string[] = []
  const unmet: Unmet[] = []
  for (const gate of gates) {
    if (!gate.triggered(ctx.signals)) continue
    crossed.push(gate.id)
    requiredGrade = higherGrade(requiredGrade, gate.to)
    for (const req of gate.activates) if (!req.satisfiedBy(ctx)) unmet.push({ gate: gate.id, requirement: req.id, describe: req.describe })
  }
  const underGraded = !gradeAtLeast(ctx.adapterGrade, requiredGrade)
  return { requiredGrade, crossed, unmet, underGraded, ok: unmet.length === 0 && !underGraded }
}

export { assertNoLoosening } from '../_kernel/grade.ts'
