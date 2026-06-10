// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   JOBS_ADAPTER = inline | retry | durable     (default: retry)

import type { Adapter, JobQueue, Grade } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, JobSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { JobQueue, JobRecord, JobState, JobHandler, EnqueueOptions } from './port.ts'
export type { Evaluation, JobSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('async-jobs')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  inline: () => import('./adapters/inline.ts'),
  retry: () => import('./adapters/retry.ts'),
  durable: () => import('./adapters/durable.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.JOBS_ADAPTER ?? 'retry'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown JOBS_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into background execution. Returns a JobQueue for a queue name.
export async function open(queue: string): Promise<JobQueue> {
  return (await current()).open(queue)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: JobSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({
    signals,
    capabilities: new Set(a.capabilities),
    adapterGrade: a.maxGrade,
  })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
