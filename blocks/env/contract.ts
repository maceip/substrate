// contract.ts — PROTOCOL S7: env's port promises as DATA.
//
// PRIMARY OUTPUT: the result of validate(spec, source) — { values, missing } — which is what
// index.ts builds the typed, fail-loud config from. The load-bearing promise is fail-loud:
// a var reported missing must never simultaneously carry a usable value.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const loadedShape = z.object({
  values: z.record(z.string(), z.unknown()),
  missing: z.array(z.string().min(1)),
})

export const CONTRACT: PortContract = {
  block: 'env',
  output: loadedShape,
  assertions: [],
  forbidden: [
    {
      id: 'no-value-for-missing-var',
      describe: 'a key listed in `missing` must not carry a defined value (fail-loud: missing means missing, never a silent default)',
      violatedBy: (v) => {
        const r = v as { values: Record<string, unknown>; missing: string[] }
        return r.missing.some((k) => r.values[k] !== undefined)
      },
    },
  ],
}

// A known-good output (two resolved vars, nothing missing) that CONTRACT must accept.
export const SAMPLE: unknown = {
  values: { PORT: 3000, NODE_ENV: 'development' },
  missing: [],
}
