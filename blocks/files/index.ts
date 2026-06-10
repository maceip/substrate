// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes.
//
//   FILES_ADAPTER = memory | fs | object     (default: fs)

import type { Adapter, BlobStore, Grade } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, FileSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { BlobStore, ObjectStat, PutOptions, UrlOptions } from './port.ts'
export type { Evaluation, FileSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('files')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  memory: () => import('./adapters/memory.ts'),
  fs: () => import('./adapters/fs.ts'),
  object: () => import('./adapters/object.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.FILES_ADAPTER ?? 'fs'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown FILES_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into blob storage. Returns a BlobStore for a namespace.
export async function open(namespace: string): Promise<BlobStore> {
  return (await current()).open(namespace)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: FileSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
