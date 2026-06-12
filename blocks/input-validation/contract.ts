// contract.ts — PROTOCOL S7: input-validation's port promises as DATA. First adoption.
//
// The same object drives construction-time verification (does an adapter honor the port?)
// and mechanical attribution (did a consumer receive a contract-violating value?).

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const errorShape = z.object({ field: z.string(), message: z.string() })
const resultShape = z.union([
  z.object({ ok: z.literal(true), value: z.record(z.string(), z.unknown()) }),
  z.object({ ok: z.literal(false), errors: z.array(errorShape) }),
])

export const CONTRACT: PortContract = {
  block: 'input-validation',
  output: resultShape,
  assertions: [
    {
      id: 'rejection-names-fields',
      describe: 'a failed Result carries at least one error, and every error names a field',
      holds: (v) => {
        const r = v as { ok: boolean; errors?: { field: string }[] }
        return r.ok || (Array.isArray(r.errors) && r.errors.length > 0 && r.errors.every((e) => e.field.length > 0))
      },
    },
  ],
  forbidden: [
    {
      id: 'no-value-on-failure',
      describe: 'a failed Result must not smuggle a value (consumers must not be able to use rejected input)',
      violatedBy: (v) => {
        const r = v as { ok: boolean; value?: unknown }
        return r.ok === false && r.value !== undefined
      },
    },
  ],
}
