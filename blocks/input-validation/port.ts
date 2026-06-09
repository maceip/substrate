// port.ts — THE PORT for input-validation. [PROTECTED]
//
// App code declares a Schema and validates untrusted input through ./index.ts. The seam this
// absorbs: HOW validation is done (hand shape-check -> coercion + detailed errors -> a shared
// client/server schema lib) changes behind the port; call sites get the same Result<T>.

export type { Grade } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

export interface FieldRule {
  type: 'string' | 'number' | 'boolean'
  required?: boolean
  min?: number // numeric bound, or string length
  max?: number
}
export type Schema = Record<string, FieldRule>

export interface ValidationError {
  field: string
  message: string
}
export type Result = { ok: true; value: Record<string, unknown> } | { ok: false; errors: ValidationError[] }

export interface Validator {
  name: string
  maxGrade: Grade
  capabilities: string[]
  parse(schema: Schema, input: unknown): Result
}
