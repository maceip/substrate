// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   ATTEST_ADAPTER = hmac | ed25519 | graduated     (default: ed25519)

import type { Adapter, Attestor, Grade, VerifyPolicy } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, AttestationSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { Attestor, Claim, Proof, VerifyResult, KeyInfo, VerifyPolicy } from './port.ts'
export type { Evaluation, AttestationSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('attestation')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  hmac: () => import('./adapters/hmac.ts'),
  ed25519: () => import('./adapters/ed25519.ts'),
  graduated: () => import('./adapters/graduated.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.ATTEST_ADAPTER ?? 'ed25519'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown ATTEST_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into attestation. Returns an Attestor for an issuer (the key
// custody namespace). The optional policy is honored by adapters with 'policy-checked'.
export async function open(issuer: string, policy?: VerifyPolicy): Promise<Attestor> {
  return (await current()).open(issuer, policy)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: AttestationSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
