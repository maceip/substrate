// contract.ts — PROTOCOL S7: schema-migrations' port promises as DATA.
//
// PRIMARY OUTPUT: the AppliedMigration[] history that applied()/apply()/rollback() hand to
// consumers — the journal of WHAT ran, sorted by version. The load-bearing promise is the
// monotonic ladder: versions strictly increase (register() rejects duplicates, apply() runs
// in order), so the history has exactly one order everywhere it runs.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const appliedShape = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  applied_at: z.string(),
  steps: z.array(z.string()),
  checksum: z.string().optional(),
})

export const CONTRACT: PortContract = {
  block: 'schema-migrations',
  output: z.array(appliedShape),
  assertions: [
    {
      id: 'versions-strictly-increase',
      describe: 'entries are sorted by strictly increasing version — the ladder is monotonic, duplicates are unrepresentable',
      holds: (v) => {
        const versions = (v as { version: number }[]).map((m) => m.version)
        return versions.every((n, i) => i === 0 || n > versions[i - 1])
      },
    },
  ],
  forbidden: [],
}

// A known-good output (a two-migration history with recorded steps) that CONTRACT must accept.
export const SAMPLE: unknown = [
  {
    id: '001-notes-baseline',
    version: 1,
    applied_at: '2026-06-12T10:00:00.000Z',
    steps: ['create collection notes'],
  },
  {
    id: '002-notes-add-tags',
    version: 2,
    applied_at: '2026-06-12T10:01:00.000Z',
    steps: ['add field notes.tags default []'],
    checksum: '9d2f1b6e',
  },
]
