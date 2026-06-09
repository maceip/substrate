// port.ts — THE PORT for the env/config block.
//
// App code declares the shape of the environment it needs (an EnvSpec) and imports the
// validated, typed result from ./index.ts. It never reads process.env directly. The seam
// this absorbs: WHERE config comes from (raw env -> .env file -> secret manager) changes
// behind the port, app code does not.
//
// AEvo: PROTECTED. The fail-loud guarantee (a missing required var stops startup) may be
// tightened, never loosened.

export type { Grade } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

export interface VarSpec {
  required?: boolean
  default?: string
  secret?: boolean
  describe?: string
  parse?: (raw: string) => unknown
}

export type EnvSpec = Record<string, VarSpec>
export type Loaded<S extends EnvSpec> = { [K in keyof S]: unknown }

export class EnvError extends Error {}

// A Source is what an adapter provides: where raw string values come from, and whether it
// can enumerate its keys (needed to honor the .env.example convention at higher grades).
export interface Source {
  name: string
  maxGrade: Grade
  capabilities: string[]
  raw(key: string): string | undefined
}

// THE PORT behavior: validate a spec against a source. Pure; the throwing happens in index.
export function validate<S extends EnvSpec>(spec: S, source: Source): { values: Loaded<S>; missing: string[] } {
  const values = {} as Record<string, unknown>
  const missing: string[] = []
  for (const key of Object.keys(spec)) {
    const vs = spec[key]
    let raw = source.raw(key)
    if (raw === undefined) raw = vs.default
    if (raw === undefined) {
      if (vs.required) missing.push(key)
      values[key] = undefined
      continue
    }
    values[key] = vs.parse ? vs.parse(raw) : raw
  }
  return { values: values as Loaded<S>, missing }
}

export function countSecrets(spec: EnvSpec): number {
  return Object.values(spec).filter((v) => v.secret).length
}
