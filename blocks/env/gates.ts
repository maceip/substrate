// gates.ts — grading model for the env/config block. [PROTECTED]
//
// Same shape as persistence/gates.ts (executable thresholds → activated requirements), tuned
// to config's failure modes: the danger is a secret that is undeclared, unmanaged, or
// unrotated. Signals are observed (how many secrets, is this prod, how many instances).

import type { Grade } from '../_kernel/grade.ts'
import { gradeAtLeast, higherGrade } from '../_kernel/grade.ts'

export interface EnvSignals {
  secrets: number // vars marked secret in the spec
  prod: boolean
  instances: number
}

export interface RequirementContext {
  signals: EnvSignals
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
  triggered: (s: EnvSignals) => boolean
  activates: Requirement[]
}

const exampleFile: Requirement = {
  id: 'example-file',
  describe: 'config keys are documented (a .env.example manifest) so a missing secret is obvious, not silent',
  satisfiedBy: (c) => c.capabilities.has('example-file'),
}
const managerSourced: Requirement = {
  id: 'manager-sourced',
  describe: 'secrets come from a manager, not a committed file or raw shell env',
  satisfiedBy: (c) => c.capabilities.has('manager-sourced'),
}
const rotation: Requirement = {
  id: 'rotation',
  describe: 'secrets can be rotated without a redeploy',
  satisfiedBy: (c) => c.capabilities.has('rotation'),
}

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'the project has secrets — they must be declared somewhere a new dev can see',
    triggered: (s) => s.secrets > 0,
    activates: [exampleFile],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'secrets in production — a committed/raw value is now a liability',
    triggered: (s) => s.prod && s.secrets > 0,
    activates: [managerSourced, rotation],
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
    for (const req of gate.activates) {
      if (!req.satisfiedBy(ctx)) unmet.push({ gate: gate.id, requirement: req.id, describe: req.describe })
    }
  }
  const underGraded = !gradeAtLeast(ctx.adapterGrade, requiredGrade)
  return { requiredGrade, crossed, unmet, underGraded, ok: unmet.length === 0 && !underGraded }
}

export { assertNoLoosening } from '../_kernel/grade.ts'
