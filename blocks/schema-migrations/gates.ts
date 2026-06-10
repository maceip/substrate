// gates.ts — THE GRADING / GATING MODEL for schema-migrations. [PROTECTED]
//
// Vocabulary (see ../README.md):
//   GRADE  — which adapter runs the migrations (nursery < elementary < graduated).
//   GATE   — an executable threshold over OBSERVABLE project signals. When it flips true,
//            the block must be at >= a higher grade, AND new REQUIREMENTS activate.
//
// The ladder is mined, not invented (../../outputs/port-catalog-v0.md, `schema-migrations`):
// baseline schema with id/created_at/updated_at and generated migrations -> multi-step
// migrations, backfills, compatibility gates.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface MigrationSignals {
  prodData: boolean // the schema governs data that must survive in production
  schemaChanges: number // schema changes shipped so far — each one is a migration that should exist
  instances: number // app processes/replicas that must agree on the schema version
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: MigrationSignals
  capabilities: Set<string> // what the current adapter guarantees
  adapterGrade: Grade // current adapter's maxGrade
  migrationsRegistered: number
  migrationsWithDown: number // how many registered migrations carry a down()
  versionsMonotonic: boolean // registered versions strictly increase
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
  triggered: (s: MigrationSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const historyRecorded: Requirement = {
  id: 'history-recorded',
  describe: 'the applied set survives the process (a durable journal), not an in-memory flag a re-deploy forgets',
  satisfiedBy: (c) => c.capabilities.has('journal'),
}

const monotonicVersions: Requirement = {
  id: 'monotonic-versions',
  describe: 'schema changes ship as registered migrations with strictly increasing versions, at least one registered',
  satisfiedBy: (c) => c.migrationsRegistered >= 1 && c.versionsMonotonic,
}

const downDefined: Requirement = {
  id: 'down-defined',
  describe: 'every registered migration carries a down() so a bad deploy rolls back instead of stranding the schema',
  satisfiedBy: (c) => c.migrationsRegistered > 0 && c.migrationsWithDown === c.migrationsRegistered,
}

const compatChecked: Requirement = {
  id: 'compat-checked',
  describe: 'applied history is checksum-verified against the sources — drift between versions is caught, not assumed away',
  satisfiedBy: (c) => c.capabilities.has('checksum-verify'),
}

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'more than one schema change, or the data now matters in production — what ran where must outlive the process',
    triggered: (s) => s.prodData || s.schemaChanges > 1,
    activates: [historyRecorded, monotonicVersions],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'multiple instances or sustained schema churn — every instance must agree on the version, and compatibility must be checked, not assumed',
    triggered: (s) => s.instances > 1 || s.schemaChanges > 10,
    activates: [downDefined, compatChecked],
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
