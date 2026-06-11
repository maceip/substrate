// adapters/schema-lib.ts — GRADUATED grade, and the DEFAULT.
//
// Zod behind the SAME port. The global open-source strata already baked in every generic
// validation lesson (coercion, precise per-field rejection, schema-derived types); wrapping it
// inherits those lessons instead of re-deriving them one bug at a time. The FieldRule schema
// compiles to a z object; app code sees the identical Result the hand-rolled grades return.
// shape-check/detailed remain as dependency-free fallbacks for environments with no node_modules.

import { z } from 'zod'
import type { FieldRule, Result, Schema, ValidationError, Validator } from '../port.ts'

function compile(rule: FieldRule): z.ZodType {
  if (rule.type === 'number') {
    let n = z.coerce.number()
    if (rule.min !== undefined) n = n.min(rule.min)
    if (rule.max !== undefined) n = n.max(rule.max)
    return n
  }
  if (rule.type === 'boolean') {
    // z.coerce.boolean() is Boolean(v) — 'false' would become true. Preprocess the two
    // string literals so string-transported booleans round-trip, then require a real boolean.
    return z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean())
  }
  let s = z.coerce.string()
  if (rule.min !== undefined) s = s.min(rule.min)
  if (rule.max !== undefined) s = s.max(rule.max)
  return s
}

export function parseZod(schema: Schema, input: unknown): Result {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: [{ field: '(root)', message: 'expected an object' }] }
  }
  const obj = input as Record<string, unknown>
  const errors: ValidationError[] = []
  const value: Record<string, unknown> = {}

  for (const [field, rule] of Object.entries(schema)) {
    const v = obj[field]
    // Port semantics shared by every grade: undefined/null/'' count as absent.
    if (v === undefined || v === null || v === '') {
      if (rule.required) errors.push({ field, message: 'required' })
      continue
    }
    const r = compile(rule).safeParse(v)
    if (r.success) value[field] = r.data
    else for (const issue of r.error.issues) errors.push({ field, message: issue.message })
  }

  return errors.length ? { ok: false, errors } : { ok: true, value }
}

export const validator: Validator = {
  name: 'schema-lib',
  maxGrade: 'graduated',
  capabilities: ['detailed-errors', 'coercion', 'shared-schema', 'type-generation'],
  parse: parseZod,
}
