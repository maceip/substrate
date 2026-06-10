// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   AI_ADAPTER = anthropic | resilient | multi-provider     (default: resilient)

import type { Adapter, Grade, ModelClient, OpenOptions } from './port.ts'
import { evaluate } from './gates.ts'
import type { AiSignals, Evaluation } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { ChatMessage, CompleteRequest, Completion, ModelClient, OpenOptions, ProviderUsage, Transport, Usage } from './port.ts'
export type { AiSignals, Evaluation } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('ai-model')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  anthropic: () => import('./adapters/anthropic.ts'),
  resilient: () => import('./adapters/resilient.ts'),
  'multi-provider': () => import('./adapters/multi-provider.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.AI_ADAPTER ?? 'resilient'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown AI_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into the model provider. Returns a ModelClient; pass a
// transport in opts to take the test seam, pass nothing to use the real API.
export async function open(opts?: OpenOptions): Promise<ModelClient> {
  return (await current()).open(opts)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: AiSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
