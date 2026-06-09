// gates.ts — grading model for transport/http. [PROTECTED]

import type { Grade } from '../_kernel/grade.ts'
import { gradeAtLeast, higherGrade } from '../_kernel/grade.ts'

export interface TransportSignals {
  public: boolean // reachable by untrusted callers
  prod: boolean
  instances: number
}

export interface RequirementContext {
  signals: TransportSignals
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
  triggered: (s: TransportSignals) => boolean
  activates: Requirement[]
}

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const middleware = cap('middleware', 'boundary-pipeline', 'a place at the edge to validate input and guard abuse before handlers run')
const gracefulShutdown = cap('graceful-shutdown', 'graceful-shutdown', 'in-flight requests drain on shutdown instead of being dropped')
const streaming = cap('streaming', 'response-streaming', 'backpressure-safe streaming responses for scale behind a balancer')

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'public or production traffic needs a boundary to validate/guard and a clean shutdown',
    triggered: (s) => s.public || s.prod,
    activates: [middleware, gracefulShutdown],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'multiple instances behind a balancer want a hardened, streaming-capable server',
    triggered: (s) => s.instances > 1,
    activates: [streaming],
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
