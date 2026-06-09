// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   PERSIST_ADAPTER = memory | file | graduated     (default: file)

import type { Adapter, Store, Grade } from './port.ts'
import type { BaseRecord } from './schema.ts'
import { hasBaseField } from './schema.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, ProjectSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { Store } from './port.ts'
export type { BaseRecord } from './schema.ts'
export type { Evaluation, ProjectSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('persistence')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  memory: () => import('./adapters/memory.ts'),
  file: () => import('./adapters/file.ts'),
  graduated: () => import('./adapters/graduated.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.PERSIST_ADAPTER ?? 'file'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown PERSIST_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into persistence. Returns a Store<T> for a collection.
export async function open<T extends BaseRecord>(collection: string): Promise<Store<T>> {
  return (await current()).open<T>(collection)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
// `sampleRecord` lets the evaluator introspect the schema (e.g. "does this carry version?").
export async function checkGrade(
  signals: ProjectSignals,
  opts: { sampleRecord?: object; migrationsRegistered?: number } = {},
): Promise<Evaluation> {
  const a = await current()
  return evaluate({
    signals,
    capabilities: new Set(a.capabilities),
    adapterGrade: a.maxGrade,
    hasField: (name) => (opts.sampleRecord ? hasBaseField(opts.sampleRecord, name) : true),
    migrationsRegistered: opts.migrationsRegistered ?? 0,
  })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
