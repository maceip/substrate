// gates.ts — THE GRADING / GATING MODEL for async-jobs. [PROTECTED]
//
// Vocabulary (settled in ../README.md):
//   GRADE — which adapter sits behind the port (nursery < elementary < graduated).
//   GATE  — an executable threshold over OBSERVABLE project signals. When it flips true,
//           the block must be at >= a higher grade, AND new REQUIREMENTS activate.
//
// The ladder comes from the port catalog (`async-jobs-workers`): local worker with explicit
// job status -> retries/dead-letters -> queue/distributed workers. The moment jobs touch
// flaky external services or matter in production, "first failure is terminal" stops being
// acceptable; the moment workers multiply or volume gets real, an in-memory single-worker
// queue stops holding the line.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface JobSignals {
  external: boolean // jobs call external services — transient failure is normal, not exceptional
  prodJobs: boolean // job outcomes matter in production — a silently lost job is an incident
  instances: number // worker processes/replicas running concurrently
  jobsPerDay: number // approximate daily job volume
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: JobSignals
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
  triggered: (s: JobSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const retries: Requirement = {
  id: 'retries',
  describe: 'failed jobs are re-attempted with backoff before being declared dead — transient failure is not terminal',
  satisfiedBy: (c) => c.capabilities.has('retries'),
}

const deadLetter: Requirement = {
  id: 'dead-letter',
  describe: 'jobs that exhaust their attempts land in an inspectable dead-letter list, never silently vanish',
  satisfiedBy: (c) => c.capabilities.has('dead-letter'),
}

const durableQueue: Requirement = {
  id: 'durable-queue',
  describe: 'queued jobs survive a process restart — an accepted enqueue is a promise, not a hope',
  satisfiedBy: (c) => c.capabilities.has('durable-queue'),
}

const concurrency: Requirement = {
  id: 'concurrency',
  describe: 'a bounded worker pool runs jobs concurrently — one slow job cannot stall the whole queue',
  satisfiedBy: (c) => c.capabilities.has('concurrency'),
}

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'jobs now touch external services or matter in production — a first failure being terminal is no longer acceptable',
    triggered: (s) => s.external || s.prodJobs,
    activates: [retries, deadLetter],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'multiple workers or real volume — an in-memory single-worker queue cannot hold the line',
    triggered: (s) => s.instances > 1 || s.jobsPerDay > 10_000,
    activates: [durableQueue, concurrency],
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
