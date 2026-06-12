// contract.ts — PROTOCOL S7: transport's port promises as DATA.
//
// PRIMARY OUTPUT: the Res that handle()/handlers/middleware hand downstream — the one shape
// every route, every middleware short-circuit, and every in-process dispatch resolves to.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const resShape = z.object({
  status: z.number().int(),
  body: z.unknown(),
})

export const CONTRACT: PortContract = {
  block: 'transport',
  output: resShape,
  assertions: [
    {
      id: 'status-is-http',
      describe: 'status is an integer in the HTTP range 100-599 (a Res is always a writable HTTP response)',
      holds: (v) => {
        const s = (v as { status: number }).status
        return Number.isInteger(s) && s >= 100 && s <= 599
      },
    },
  ],
  forbidden: [],
}

// A known-good output (a 200 with a JSON body) that CONTRACT must accept.
export const SAMPLE: unknown = { status: 200, body: { ok: true } }
