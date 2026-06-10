// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls gateSet() / checkGrade() and is blind
// to which grade is behind them. Swapping grade = one env var, zero app-code changes — a GateSet an
// app registered at nursery keeps working unchanged at graduated; report.attribution just turns on.
//
//   GATES_ADAPTER = nursery | elementary | graduated     (default: elementary)
//
// (Defaults to elementary, the protected-baseline grade — like persistence defaults to file, the
// durable grade: the nursery grade is for tests and the first agent loop, not the real default.)

import type { Adapter, GateSet, Grade, Severity } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, AgentGateSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

// The port surface app code is allowed to name. Adapters are NEVER imported by the app.
export type { Artifact, Severity, GateResult, Gate, Failure, Attribution, Report, GateSet, Grade } from './port.ts'
export { gradeAtLeast } from './port.ts'
export type { Evaluation, AgentGateSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this block
// reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('agent-gates')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  nursery: () => import('./adapters/nursery.ts'),
  elementary: () => import('./adapters/elementary.ts'),
  graduated: () => import('./adapters/graduated.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.GATES_ADAPTER ?? 'elementary'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown GATES_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// gateSet: the app's entry point. Returns a GateSet to register gates on and evaluate artifacts with.
// `committedGateIds` is the human-approved baseline an elementary+ grade refuses to loosen (a committed
// gate id cannot be removed or downgraded block->warn without a human committing the looser snapshot).
export async function gateSet(opts?: { committedGateIds?: { id: string; severity: Severity }[] }): Promise<GateSet> {
  return (await current()).open(opts)
}

// checkGrade: run the protected GRADE-gate evaluator (gates.ts) against the live adapter + the project
// signals. This is the SHARED block-grading axis — distinct from the GateSet port, which grades agent
// output. It answers "must this block grade up?", same shape every block returns.
export async function checkGrade(signals: AgentGateSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
