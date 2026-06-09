// index.ts — THE ONLY FILE APP CODE IMPORTS for logging.
//   LOG_SINK = console | structured | sink   (default: structured)

import type { Grade } from '../_kernel/grade.ts'
import type { Fields, Logger, Sink } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, LogSignals } from './gates.ts'

export type { Logger, Fields, Level } from './port.ts'
export type { Evaluation, LogSignals } from './gates.ts'

const SINKS: Record<string, () => Promise<{ sink: Sink }>> = {
  console: () => import('./adapters/console.ts'),
  structured: () => import('./adapters/structured.ts'),
  sink: () => import('./adapters/sink.ts'),
}

let loaded: Sink | null = null
async function current(): Promise<Sink> {
  if (loaded) return loaded
  const name = process.env.LOG_SINK ?? 'structured'
  const mod = SINKS[name]
  if (!mod) throw new Error(`unknown LOG_SINK=${name} (expected: ${Object.keys(SINKS).join(', ')})`)
  loaded = (await mod()).sink
  return loaded
}

export async function getLogger(base?: Fields): Promise<Logger> {
  return (await current()).create(base)
}

export async function checkGrade(signals: LogSignals): Promise<Evaluation> {
  const s = await current()
  return evaluate({ signals, capabilities: new Set(s.capabilities), adapterGrade: s.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
