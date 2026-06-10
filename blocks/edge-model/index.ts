// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   MODEL_ADAPTER = nursery | elementary | graduated     (default: elementary)

import type { Adapter, Grade, ModelRuntime, OpenOptions } from './port.ts'
import { evaluate } from './gates.ts'
import type { EdgeSignals, Evaluation } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { Converter, FetchResult, ConvertResult, Inference, ModelRef, ModelRuntime, OpenOptions, RunInput, RunResult, RuntimeInfo, Transport } from './port.ts'
export type { EdgeSignals, Evaluation } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('edge-model')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  nursery: () => import('./adapters/nursery.ts'),
  elementary: () => import('./adapters/elementary.ts'),
  graduated: () => import('./adapters/graduated.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.MODEL_ADAPTER ?? 'elementary'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown MODEL_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into the local model runtime. Returns a ModelRuntime; pass a
// transport/converter/inference in opts to take the test seam, pass nothing for the real ones.
export async function open(opts?: OpenOptions): Promise<ModelRuntime> {
  return (await current()).open(opts)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: EdgeSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
