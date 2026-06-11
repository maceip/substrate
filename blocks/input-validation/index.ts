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
// or null to let the request continue. On success the COERCED value replaces req.body — the
// handler must see what the validator accepted, not the raw input (a coercing adapter may have
// turned `dir: 42` into "42"; handing the handler the raw number reintroduces the bug the
// boundary exists to stop).
export function validate(schema: Schema) {
  return async (req: { body: unknown }) => {
    const r = await parse(schema, req.body)
    if (!r.ok) return { status: 400, body: { error: 'validation failed', errors: r.errors } }
    req.body = r.value
    return null
  }
}

export async function checkGrade(signals: ValidationSignals): Promise<Evaluation> {
  const v = await current()
  return evaluate({ signals, capabilities: new Set(v.capabilities), adapterGrade: v.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
