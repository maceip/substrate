// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   PAYMENT_ADAPTER = memory | file | graduated     (default: file — the durable ledger)

import type { Adapter, Grade, OpenOptions, PaymentRail } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, PaymentSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { Balance, Charge, ChargeRequest, ChargeStatus, LedgerEntry, OpenOptions, PaymentRail, Transport, WebhookEvent } from './port.ts'
export type { Evaluation, PaymentSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('payment')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  memory: () => import('./adapters/memory.ts'),
  file: () => import('./adapters/file.ts'),
  graduated: () => import('./adapters/graduated.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.PAYMENT_ADAPTER ?? 'file'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown PAYMENT_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into the payment rail. Returns a PaymentRail; pass a transport
// in opts to take the test seam for the provider grade, pass nothing to use the real provider.
export async function open(opts?: OpenOptions): Promise<PaymentRail> {
  return (await current()).open(opts)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: PaymentSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
