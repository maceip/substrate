// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade runs its migrations. Swapping grade = one env var, zero app-code
// changes, zero edits to the migration definitions.
//
//   MIGRATIONS_ADAPTER = memory | file | graduated     (default: file)

import type { Adapter, Grade, Migration, Migrator } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, MigrationSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { Migration, MigrationContext, Migrator, AppliedMigration, PlanStep } from './port.ts'
export type { Evaluation, MigrationSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('schema-migrations')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  memory: () => import('./adapters/memory.ts'),
  file: () => import('./adapters/file.ts'),
  graduated: () => import('./adapters/graduated.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.MIGRATIONS_ADAPTER ?? 'file'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown MIGRATIONS_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point. Returns the Migrator governing one scope (one schema/database).
export async function open(scope: string): Promise<Migrator> {
  return (await current()).open(scope)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
// Pass the registered migrations so the evaluator can introspect counts, down() coverage, and
// version monotonicity. Note: registered().length is also the number that feeds persistence's
// `migrations-registered` requirement (persistence.checkGrade({ migrationsRegistered })).
export async function checkGrade(
  signals: MigrationSignals,
  opts: { registered?: Migration[] } = {},
): Promise<Evaluation> {
  const a = await current()
  const regs = opts.registered ?? []
  const versions = regs.map((m) => m.version).sort((x, y) => x - y)
  return evaluate({
    signals,
    capabilities: new Set(a.capabilities),
    adapterGrade: a.maxGrade,
    migrationsRegistered: regs.length,
    migrationsWithDown: regs.filter((m) => typeof m.down === 'function').length,
    versionsMonotonic: versions.every((v, i) => i === 0 || v > versions[i - 1]),
  })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
