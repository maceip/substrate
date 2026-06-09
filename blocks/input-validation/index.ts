// index.ts — THE ONLY FILE APP CODE IMPORTS for input-validation.
//   VALIDATE_IMPL = shape-check | detailed | schema-lib   (default: detailed)
//
// Exports parse() for direct use, and validate(schema) — a boundary middleware structurally
// compatible with the transport block's Middleware (req -> Res | null), so it plugs into
// router.use() without either block importing the other.

import type { Grade } from '../_kernel/grade.ts'
import type { Result, Schema, Validator } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, ValidationSignals } from './gates.ts'

export type { Schema, FieldRule, Result, ValidationError } from './port.ts'
export type { Evaluation, ValidationSignals } from './gates.ts'

const IMPLS: Record<string, () => Promise<{ validator: Validator }>> = {
  'shape-check': () => import('./adapters/shape-check.ts'),
  detailed: () => import('./adapters/detailed.ts'),
  'schema-lib': () => import('./adapters/schema-lib.ts'),
}

let loaded: Validator | null = null
async function current(): Promise<Validator> {
  if (loaded) return loaded
  const name = process.env.VALIDATE_IMPL ?? 'detailed'
  const mod = IMPLS[name]
  if (!mod) throw new Error(`unknown VALIDATE_IMPL=${name} (expected: ${Object.keys(IMPLS).join(', ')})`)
  loaded = (await mod()).validator
  return loaded
}

export async function parse(schema: Schema, input: unknown): Promise<Result> {
  return (await current()).parse(schema, input)
}

// validate: a transport-compatible boundary middleware. Returns 400 with errors on a bad body,
// or null to let the request continue.
export function validate(schema: Schema) {
  return async (req: { body: unknown }) => {
    const r = await parse(schema, req.body)
    return r.ok ? null : { status: 400, body: { error: 'validation failed', errors: r.errors } }
  }
}

export async function checkGrade(signals: ValidationSignals): Promise<Evaluation> {
  const v = await current()
  return evaluate({ signals, capabilities: new Set(v.capabilities), adapterGrade: v.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
