// adapters/shape-check.ts — NURSERY grade. Required-keys + typeof check. Rejects bad input but
// only with generic per-field messages and no coercion. Fine until something untrusted shows up.

import type { Schema, Validator } from '../port.ts'

export function parseShape(schema: Schema, input: unknown) {
  if (typeof input !== 'object' || input === null) return { ok: false as const, errors: [{ field: '(root)', message: 'invalid' }] }
  const obj = input as Record<string, unknown>
  const errors: { field: string; message: string }[] = []
  for (const [field, rule] of Object.entries(schema)) {
    const v = obj[field]
    if (v === undefined || v === null) {
      if (rule.required) errors.push({ field, message: 'invalid' })
      continue
    }
    if (typeof v !== rule.type) errors.push({ field, message: 'invalid' })
  }
  return errors.length ? { ok: false as const, errors } : { ok: true as const, value: obj }
}

export const validator: Validator = {
  name: 'shape-check',
  maxGrade: 'nursery',
  capabilities: [],
  parse: parseShape,
}
