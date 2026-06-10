// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls connect() / checkGrade() and
// is blind to which grade is behind them. Swapping grade = one env var, zero app-code
// changes. Note what is NOT exported: the adversary seam (adapters/_adversary.ts) — app
// code gets handles and envelopes, never the engine's address table.
//
//   PRIVACY_ADAPTER = broker | relay | mixnet     (default: relay)

import type { Adapter, PrivateTransport, Grade } from './port.ts'
import { evaluate } from './gates.ts'
import type { PrivacySignals, Evaluation } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { PrivateTransport, Registration, Receipt, Envelope } from './port.ts'
export { HANDLE_SHAPE } from './port.ts'
export type { PrivacySignals, Evaluation } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('network-privacy')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  broker: () => import('./adapters/broker.ts'),
  relay: () => import('./adapters/relay.ts'),
  mixnet: () => import('./adapters/mixnet.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.PRIVACY_ADAPTER ?? 'relay'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown PRIVACY_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// connect: the app's entry point. Returns one PrivateTransport — one private network whose
// parties are distinguished only by opaque handle.
export async function connect(): Promise<PrivateTransport> {
  return (await current()).connect()
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: PrivacySignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
