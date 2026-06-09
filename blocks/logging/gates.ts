// gates.ts — grading model for logging/observability. [PROTECTED]

import type { Grade } from '../_kernel/grade.ts'
import { gradeAtLeast, higherGrade } from '../_kernel/grade.ts'

export interface LogSignals {
  prod: boolean
  instances: number
}

export interface RequirementContext {
  signals: LogSignals
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
  triggered: (s: LogSignals) => boolean
  activates: Requirement[]
}

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const structured = cap('structured', 'structured-output', 'logs are machine-parseable JSON, not interpolated strings')
const redaction = cap('redaction', 'secret-redaction', 'secret-looking fields (password/token/authorization) are redacted, not printed')
const externalSink = cap('sink', 'external-sink', 'logs ship to a central sink, not just one process stdout')
const correlation = cap('correlation', 'correlation-id', 'every line carries a correlation/trace id so requests can be followed across instances')

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'in production logs must be parseable and must not leak secrets',
    triggered: (s) => s.prod,
    activates: [structured, redaction],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'multiple instances — stdout is scattered; logs need a central sink and correlation',
    triggered: (s) => s.instances > 1,
    activates: [externalSink, correlation],
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
