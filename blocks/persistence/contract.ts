// contract.ts — PROTOCOL S7: persistence's port promises as DATA.
//
// PRIMARY OUTPUT: the stored record (BaseRecord + domain fields) that create/get/update/list
// hand to consumers. id + created_at/updated_at + version are pre-installed structure; the
// version field is the seam optimistic concurrency and schema evolution hang off.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const recordShape = z
  .object({
    id: z.string().min(1),
    created_at: z.string(),
    updated_at: z.string(),
    version: z.number().int(),
  })
  .loose() // domain fields ride alongside the base fields

export const CONTRACT: PortContract = {
  block: 'persistence',
  output: recordShape,
  assertions: [
    {
      id: 'version-starts-at-one',
      describe: 'version is a positive integer (1 on create, bumped on every update) — the optimistic-concurrency seam',
      holds: (v) => {
        const r = v as { version: number }
        return Number.isInteger(r.version) && r.version >= 1
      },
    },
    {
      id: 'timestamps-ordered',
      describe: 'created_at/updated_at are parseable ISO-8601 and updated_at never precedes created_at',
      holds: (v) => {
        const r = v as { created_at: string; updated_at: string }
        const c = Date.parse(r.created_at)
        const u = Date.parse(r.updated_at)
        return !Number.isNaN(c) && !Number.isNaN(u) && u >= c
      },
    },
  ],
  forbidden: [],
}

// A known-good output (a stamped record after one update) that CONTRACT must accept.
export const SAMPLE: unknown = {
  id: '3f1c9a2e-7b4d-4e0a-9c1f-2d8e5b6a7c90',
  created_at: '2026-06-12T10:00:00.000Z',
  updated_at: '2026-06-12T10:05:00.000Z',
  version: 2,
  title: 'first note',
}
