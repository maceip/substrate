// contract.ts — PROTOCOL S7: async-jobs' port promises as DATA.
//
// PRIMARY OUTPUT: the JobRecord that status()/deadLetters() hand to consumers — the
// observable lifecycle of one job. The port is timing-blind; what it DOES promise is the
// terminal-state bookkeeping: terminal iff finished, dead names its failure, and a result
// exists only on success.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const jobShape = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  state: z.enum(['queued', 'running', 'succeeded', 'dead']),
  attempts: z.number().int().min(0),
  payload: z.unknown(),
  result: z.unknown(),
  error: z.string().nullable(),
  enqueued_at: z.string(),
  finished_at: z.string().nullable(),
})

type Job = { state: string; result: unknown; error: string | null; finished_at: string | null }

export const CONTRACT: PortContract = {
  block: 'async-jobs',
  output: jobShape,
  assertions: [
    {
      id: 'terminal-iff-finished',
      describe: "finished_at is set exactly when the state is terminal ('succeeded' or 'dead'), never on transient states",
      holds: (v) => {
        const r = v as Job
        return (r.state === 'succeeded' || r.state === 'dead') === (r.finished_at !== null)
      },
    },
    {
      id: 'dead-names-its-failure',
      describe: "a 'dead' job carries a non-empty error message — failed work is represented explicitly, never silenced",
      holds: (v) => {
        const r = v as Job
        return r.state !== 'dead' || (typeof r.error === 'string' && r.error.length > 0)
      },
    },
  ],
  forbidden: [
    {
      id: 'no-result-unless-succeeded',
      describe: "result is set when state === 'succeeded', else null — a consumer must never act on the result of a job that did not succeed",
      violatedBy: (v) => {
        const r = v as Job
        return r.state !== 'succeeded' && r.result !== null && r.result !== undefined
      },
    },
  ],
}

// A known-good output (a succeeded job after one attempt) that CONTRACT must accept.
export const SAMPLE: unknown = {
  id: 'job-7f3a2c',
  name: 'send-welcome-email',
  state: 'succeeded',
  attempts: 1,
  payload: { to: 'ada@example.com' },
  result: { delivered: true },
  error: null,
  enqueued_at: '2026-06-12T10:00:00.000Z',
  finished_at: '2026-06-12T10:00:00.250Z',
}
