// port.ts — THE PORT for schema-migrations. [PROTECTED]
//
// The single narrow interface app code is allowed to import (via ./index.ts). Defined by the
// CHANGE it absorbs: swapping HOW migrations are stored and run (in-memory registry -> file
// journal -> verified journal -> a real engine's migration table) must pass through here and
// change NOTHING above it — not app code, and not the migration definitions themselves.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// failing case) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

// Grade is the ladder every block shares (nursery < elementary < graduated). The app cannot
// tell which grade is behind the port — that is the whole point.
export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// MigrationContext: what up()/down() receive. The seam between a migration DEFINITION and the
// engine that executes it: a migration declares engine-neutral steps via exec(); what running
// a step MEANS (record it, run DDL, queue a backfill job) is the adapter's business. This is
// why swapping the runner never touches the migration files.
export interface MigrationContext {
  exec(step: string): Promise<void>
}

// Migration: one versioned schema change. `version` is monotonic — register() rejects
// duplicates — so the ladder of changes has exactly one order everywhere it runs.
// `down` is optional at the nursery; a gate makes it mandatory later (see gates.ts).
export interface Migration {
  id: string // stable name, e.g. '001-notes-baseline'
  version: number // monotonic position in the ladder; positive integer
  up(ctx: MigrationContext): void | Promise<void>
  down?(ctx: MigrationContext): void | Promise<void>
}

// AppliedMigration: one entry in the history. The journal records WHAT ran (the declared
// steps), not just that something ran — history, not a flag. `checksum` is the graduated
// grade's drift detection: a fingerprint of the migration's source at apply time.
export interface AppliedMigration {
  id: string
  version: number
  applied_at: string // ISO-8601
  steps: string[] // what up() declared via ctx.exec
  checksum?: string
}

// PlanStep: one pending migration, surfaced before anything runs.
export interface PlanStep {
  id: string
  version: number
  hasDown: boolean
}

// Migrator: the contract. Every adapter, at every grade, satisfies exactly this.
export interface Migrator {
  register(m: Migration): void
  registered(): Migration[] // sorted by version; .length feeds persistence's migrations-registered
  applied(): Promise<AppliedMigration[]> // the history, sorted by version
  plan(currentVersion?: number): Promise<PlanStep[]> // what apply would run; explicit currentVersion asks "from version X", default reads the history
  apply(target?: number): Promise<AppliedMigration[]> // applies pending in order up to target; idempotent; returns THIS run's entries
  rollback(toVersion: number): Promise<AppliedMigration[]> // undoes above toVersion in reverse via down(); returns the undone entries
  close(): Promise<void>
}

// Adapter: what each adapter file exports. The port is the SHAPE (Migrator); the adapter is
// the swappable thing behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(scope: string): Promise<Migrator>
}
