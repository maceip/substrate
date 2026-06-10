// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   CACHE_ADAPTER = memory | lru | shared-file     (default: lru)

import type { Adapter, Cache, CacheOptions, Grade } from './port.ts'
import { evaluate } from './gates.ts'
import type { CacheSignals, Evaluation } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { Cache, CacheOptions } from './port.ts'
export type { CacheSignals, Evaluation } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('cache')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  memory: () => import('./adapters/memory.ts'),
  lru: () => import('./adapters/lru.ts'),
  'shared-file': () => import('./adapters/shared-file.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.CACHE_ADAPTER ?? 'lru'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown CACHE_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into the cache. Returns a Cache<T> for a namespace.
export async function open<T>(namespace: string, opts?: CacheOptions): Promise<Cache<T>> {
  return (await current()).open<T>(namespace, opts)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: CacheSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
