// index.ts — THE ONLY FILE APP CODE IMPORTS for request-guard.
//   GUARD_IMPL = memory-fixed | sliding-shield | distributed   (default: sliding-shield)
//
// guard(opts) returns a transport-compatible boundary middleware (req -> Res | null), so it
// plugs into router.use() without either block importing the other.

import type { Grade } from '../_kernel/grade.ts'
import type { Guard, GuardMiddleware, GuardOptions } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, GuardSignals } from './gates.ts'

export type { GuardOptions, GuardReq, GuardMiddleware } from './port.ts'
export type { Evaluation, GuardSignals } from './gates.ts'

const IMPLS: Record<string, () => Promise<{ guard: Guard }>> = {
  'memory-fixed': () => import('./adapters/memory-fixed.ts'),
  'sliding-shield': () => import('./adapters/sliding-shield.ts'),
  distributed: () => import('./adapters/distributed.ts'),
}

let loaded: Guard | null = null
async function current(): Promise<Guard> {
  if (loaded) return loaded
  const name = process.env.GUARD_IMPL ?? 'sliding-shield'
  const mod = IMPLS[name]
  if (!mod) throw new Error(`unknown GUARD_IMPL=${name} (expected: ${Object.keys(IMPLS).join(', ')})`)
  loaded = (await mod()).guard
  return loaded
}

export async function guard(opts: GuardOptions): Promise<GuardMiddleware> {
  return (await current()).create(opts)
}

export async function checkGrade(signals: GuardSignals): Promise<Evaluation> {
  const g = await current()
  return evaluate({ signals, capabilities: new Set(g.capabilities), adapterGrade: g.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
