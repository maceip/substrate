// adapters/detailed.ts — ELEMENTARY grade (the default). Per-field messages, safe coercion
// (numeric strings -> numbers, "true"/"false" -> booleans), and min/max bounds. Earns the
// `detailed-errors` + `coercion` capabilities the public/prod gate requires.

import type { Schema, ValidationError, Validator } from '../port.ts'

export function parseDetailed(schema: Schema, input: unknown) {
  if (typeof input !== 'object' || input === null) return { ok: false as const, errors: [{ field: '(root)', message: 'expected an object' }] }
  const obj = input as Record<string, unknown>
  const errors: ValidationError[] = []
  const value: Record<string, unknown> = {}

  for (const [field, rule] of Object.entries(schema)) {
    let v: unknown = obj[field]
    if (v === undefined || v === null || v === '') {
      if (rule.required) errors.push({ field, message: 'required' })
      continue
    }
    if (rule.type === 'number') {
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isNaN(n)) {
        errors.push({ field, message: 'must be a number' })
        continue
      }
      v = n
    } else if (rule.type === 'boolean') {
      if (typeof v !== 'boolean') {
        if (v === 'true') v = true
        else if (v === 'false') v = false
        else {
          errors.push({ field, message: 'must be a boolean' })
          continue
        }
      }
    } else {
      if (typeof v !== 'string') v = String(v)
    }

    if (rule.type === 'number' && typeof v === 'number') {
      if (rule.min !== undefined && v < rule.min) errors.push({ field, message: `must be >= ${rule.min}` })
      if (rule.max !== undefined && v > rule.max) errors.push({ field, message: `must be <= ${rule.max}` })
    }
    if (rule.type === 'string' && typeof v === 'string') {
      if (rule.min !== undefined && v.length < rule.min) errors.push({ field, message: `must be at least ${rule.min} chars` })
      if (rule.max !== undefined && v.length > rule.max) errors.push({ field, message: `must be at most ${rule.max} chars` })
    }
    value[field] = v
  }
  return errors.length ? { ok: false as const, errors } : { ok: true as const, value }
}

export const validator: Validator = {
  name: 'detailed',
  maxGrade: 'elementary',
  capabilities: ['detailed-errors', 'coercion'],
  parse: parseDetailed,
}
