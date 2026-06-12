// contract.ts — PROTOCOL S7: request-guard's port promises as DATA.
//
// PRIMARY OUTPUT: the GuardMiddleware verdict — a blocking Res ({status, body}) or null to
// continue. The port's promise is exactly "req -> 429/413 Res, or null": a guard only ever
// rate-limits (429) or shields oversized bodies (413); it never answers for the app.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const verdictShape = z.union([z.null(), z.object({ status: z.number().int(), body: z.unknown() })])

export const CONTRACT: PortContract = {
  block: 'request-guard',
  output: verdictShape,
  assertions: [
    {
      id: 'blocks-are-429-or-413',
      describe: 'a non-null verdict is a block, and a block is only ever 429 (rate limit) or 413 (body too large)',
      holds: (v) => v === null || [429, 413].includes((v as { status: number }).status),
    },
  ],
  forbidden: [],
}

// A known-good output (a rate-limit block) that CONTRACT must accept. `null` (continue) is
// the other valid value.
export const SAMPLE: unknown = { status: 429, body: { error: 'rate limit exceeded' } }
