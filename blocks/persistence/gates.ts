// gates.ts — THE GRADING / GATING MODEL
//
// This is the file the user keeps describing: "blocks gated at elementary-school grading;
// when you hit a threshold, suddenly every database schema needs to have something."
//
// Vocabulary settled here (this is what the agents were arguing about):
//   GRADE  — which adapter sits behind the port (nursery < elementary < graduated).
//   GATE   — an executable threshold over OBSERVABLE project signals. When it flips true,
//            the block must be at >= a higher grade, AND new REQUIREMENTS activate.
//   The user's casual phrase "hit a port" == cross a GATE. The interface seam is the PORT
//   (port.ts); the milestone that forces a grade-up is a GATE. Two different words, on
//   purpose, so they stop colliding.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface ProjectSignals {
  writers: number // distinct code sites that write this store
  instances: number // app processes/replicas running concurrently
  prodData: boolean // store holds data that must outlive the process in production
  rows: number // approximate row count
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: ProjectSignals
  capabilities: Set<string> // what the current adapter guarantees
  adapterGrade: Grade // current adapter's maxGrade
  hasField: (name: string) => boolean // schema introspection
  migrationsRegistered: number
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
  triggered: (s: ProjectSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const durableWrites: Requirement = {
  id: 'durable-writes',
  describe: 'writes survive a crash (atomic file replace or a real engine), not a lossy in-memory map',
  satisfiedBy: (c) => c.capabilities.has('atomic-write') || c.capabilities.has('engine'),
}

const versionField: Requirement = {
  id: 'version-field',
  describe: 'every record carries a `version` so schema evolution + optimistic concurrency have a place to live',
  satisfiedBy: (c) => c.hasField('version'),
}

const connectionPool: Requirement = {
  id: 'connection-pool',
  describe: 'concurrent access goes through a managed pool, not one shared handle',
  satisfiedBy: (c) => c.capabilities.has('pool'),
}

const migrationsRegistered: Requirement = {
  id: 'migrations-registered',
  describe: 'schema changes ship as versioned migrations, at least one registered',
  satisfiedBy: (c) => c.migrationsRegistered >= 1,
}

const concurrentSafe: Requirement = {
  id: 'concurrent-safe',
  describe: 'engine is safe under concurrent multi-instance writes (transactions / MVCC)',
  satisfiedBy: (c) => c.capabilities.has('mvcc'),
}

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'more than one writer, or the data now matters in production — loss is no longer acceptable',
    triggered: (s) => s.writers > 1 || s.prodData,
    activates: [durableWrites, versionField],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'multiple instances or real scale — a single-process file store cannot hold the line',
    triggered: (s) => s.instances > 1 || s.rows > 50_000,
    activates: [connectionPool, migrationsRegistered, concurrentSafe],
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
