// index.ts — THE ONLY FILE APP CODE IMPORTS for realtime.
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   REALTIME_ADAPTER = emitter | buffered | graduated     (default: buffered)

import type { Adapter, Grade, PubSub } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, RealtimeSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { PubSub, Subscriber, SubscribeOpts, Subscription, SubscriberStats, TopicEvent } from './port.ts'
export type { Evaluation, RealtimeSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('realtime')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  emitter: () => import('./adapters/emitter.ts'),
  buffered: () => import('./adapters/buffered.ts'),
  graduated: () => import('./adapters/graduated.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.REALTIME_ADAPTER ?? 'buffered'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown REALTIME_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into realtime. Returns a PubSub; the app MUST close() it —
// that is the contract that keeps servers/streams from outliving the app.
export async function open(): Promise<PubSub> {
  return (await current()).open()
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: RealtimeSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
