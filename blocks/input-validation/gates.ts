// gates.ts — grading model for input-validation. [PROTECTED]

import type { Grade } from '../_kernel/grade.ts'
import { gradeAtLeast, higherGrade } from '../_kernel/grade.ts'

export interface ValidationSignals {
  public: boolean // untrusted callers reach this input
  prod: boolean
  sharedClient: boolean // a separate client consumes the same shapes
}

export interface RequirementContext {
  signals: ValidationSignals
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
  triggered: (s: ValidationSignals) => boolean
  activates: Requirement[]
}

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const detailedErrors = cap('detailed-errors', 'detailed-errors', 'rejections name the offending field + reason, not just "invalid"')
const coercion = cap('coercion', 'safe-coercion', 'inputs are coerced to the declared type before use, not trusted as-is')
const sharedSchema = cap('shared-schema', 'shared-schema', 'the boundary schema is shared with the client so the two cannot drift')

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'untrusted input needs precise rejection and safe coercion, not a boolean pass/fail',
    triggered: (s) => s.public || s.prod,
    activates: [detailedErrors, coercion],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'a separate client consumes these shapes — the schema must be shared or they drift',
    triggered: (s) => s.sharedClient,
    activates: [sharedSchema],
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
