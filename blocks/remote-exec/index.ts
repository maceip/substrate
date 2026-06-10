// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
// The default is LOCAL (nursery), so the block is SAFE OUT OF THE BOX — nothing reaches a
// network or reads a key until you deliberately point it at a host.
//
//   REMOTE_ADAPTER = local | ssh | fleet     (default: local)
//
// `local` runs on localhost (needs nothing). `ssh` needs a host (opts.host or REMOTE_HOST).
// `fleet` needs an inventory (opts.hosts or REMOTE_HOSTS). A test passes opts.executor to
// take the injectable seam — zero ssh, zero network.

import type { Adapter, Grade, OpenOptions, RemoteHost } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, RemoteSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { CopyFn, ExecFn, ExecResult, Executor, HostConfig, OpenOptions, RemoteHost, RunResult } from './port.ts'
export type { Evaluation, RemoteSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('remote-exec')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  local: () => import('./adapters/local.ts'),
  ssh: () => import('./adapters/ssh.ts'),
  fleet: () => import('./adapters/fleet.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.REMOTE_ADAPTER ?? 'local'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown REMOTE_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into remote execution. Returns a RemoteHost; pass an executor
// in opts to take the test seam, pass nothing to use the real child_process/fs executor.
export async function open(opts?: OpenOptions): Promise<RemoteHost> {
  return (await current()).open(opts)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: RemoteSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
