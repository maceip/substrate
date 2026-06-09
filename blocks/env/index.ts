// index.ts — THE ONLY FILE APP CODE IMPORTS for env/config.
//   ENV_SOURCE = process | dotenv | manager   (default: dotenv)

import type { Grade } from '../_kernel/grade.ts'
import type { EnvSpec, Loaded, Source } from './port.ts'
import { EnvError, countSecrets, validate } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, EnvSignals } from './gates.ts'

export type { EnvSpec, VarSpec } from './port.ts'
export type { Evaluation, EnvSignals } from './gates.ts'

const SOURCES: Record<string, () => Promise<{ source: Source }>> = {
  process: () => import('./adapters/process-env.ts'),
  dotenv: () => import('./adapters/dotenv-file.ts'),
  manager: () => import('./adapters/manager.ts'),
}

let loaded: Source | null = null
async function current(): Promise<Source> {
  if (loaded) return loaded
  const name = process.env.ENV_SOURCE ?? 'dotenv'
  const mod = SOURCES[name]
  if (!mod) throw new EnvError(`unknown ENV_SOURCE=${name} (expected: ${Object.keys(SOURCES).join(', ')})`)
  loaded = (await mod()).source
  return loaded
}

// load: validate the spec and FAIL LOUD if a required var is missing. The nursery guarantee.
export async function load<S extends EnvSpec>(spec: S): Promise<Loaded<S>> {
  const { values, missing } = validate(spec, await current())
  if (missing.length) throw new EnvError(`missing required env: ${missing.join(', ')}`)
  return values
}

// checkGrade: run the protected gate evaluator for a given spec + project signals.
export async function checkGrade(spec: EnvSpec, signals: Omit<EnvSignals, 'secrets'>): Promise<Evaluation> {
  const s = await current()
  return evaluate({
    signals: { ...signals, secrets: countSecrets(spec) },
    capabilities: new Set(s.capabilities),
    adapterGrade: s.maxGrade,
  })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
