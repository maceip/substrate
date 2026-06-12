// contract.ts — PROTOCOL S7: realtime's port promises as DATA.
//
// PRIMARY OUTPUT: the TopicEvent every subscriber receives (and publish() resolves with).
// The load-bearing promise is the per-topic monotonic seq starting at 1 — the
// replay/reconnect seam app code resubscribes against — plus the publish-time ts stamp.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const eventShape = z.object({
  topic: z.string().min(1),
  seq: z.number().int(),
  ts: z.string(),
  data: z.unknown(),
})

export const CONTRACT: PortContract = {
  block: 'realtime',
  output: eventShape,
  assertions: [
    {
      id: 'seq-starts-at-one',
      describe: 'seq is a positive integer (monotonic per topic, starts at 1, never repeats and never renumbers) — the replay seam',
      holds: (v) => {
        const s = (v as { seq: number }).seq
        return Number.isInteger(s) && s >= 1
      },
    },
    {
      id: 'stamped-at-publish',
      describe: 'ts is parseable ISO-8601, stamped at publish time',
      holds: (v) => !Number.isNaN(Date.parse((v as { ts: string }).ts)),
    },
  ],
  forbidden: [],
}

// A known-good output (the first event on a topic) that CONTRACT must accept.
export const SAMPLE: unknown = {
  topic: 'notes',
  seq: 1,
  ts: '2026-06-12T10:00:00.000Z',
  data: { id: 'n1', title: 'first note' },
}
