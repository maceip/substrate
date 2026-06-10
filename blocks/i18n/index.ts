// index.ts — THE ONLY FILE APP CODE IMPORTS
//
// Re-exports the port and selects the adapter. App code calls open() / checkGrade() and is
// blind to which grade is behind them. Swapping grade = one env var, zero app-code changes:
// the t() calls in a view are identical whether one in-memory catalog or twelve imported
// locales sit behind them.
//
//   I18N_ADAPTER = nursery | elementary | graduated     (default: elementary, the multi-locale one)

import type { Adapter, I18n, Grade, MissingReport } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, I18nSignals } from './gates.ts'
import { forBlock } from '../_kernel/fot.ts'

export type { I18n, Messages, MissingReport, TranslateOptions } from './port.ts'
export type { Evaluation, I18nSignals } from './gates.ts'

// FoT: app code deposits a distilled lesson with learn(), and a later project that pulls this
// block reads it back with insights() — no hand-copying. See ../_kernel/fot.ts.
export const { learn, insights } = forBlock('i18n')

const ADAPTERS: Record<string, () => Promise<{ adapter: Adapter }>> = {
  nursery: () => import('./adapters/nursery.ts'),
  elementary: () => import('./adapters/elementary.ts'),
  graduated: () => import('./adapters/graduated.ts'),
}

let loaded: Adapter | null = null

async function current(): Promise<Adapter> {
  if (loaded) return loaded
  const name = process.env.I18N_ADAPTER ?? 'elementary'
  const mod = ADAPTERS[name]
  if (!mod) throw new Error(`unknown I18N_ADAPTER=${name} (expected: ${Object.keys(ADAPTERS).join(', ')})`)
  loaded = (await mod()).adapter
  return loaded
}

// open: the app's entry point into i18n. Returns an I18n for a default locale. `onMissing` is the
// report seam — pass it to route missing keys/vars somewhere louder than a console.warn.
export async function open(defaultLocale: string, onMissing?: (r: MissingReport) => void): Promise<I18n> {
  return (await current()).open(defaultLocale, onMissing)
}

// checkGrade: run the protected gate evaluator against the live adapter + project signals.
export async function checkGrade(signals: I18nSignals): Promise<Evaluation> {
  const a = await current()
  return evaluate({ signals, capabilities: new Set(a.capabilities), adapterGrade: a.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
