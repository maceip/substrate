// contract.ts — PROTOCOL S7: logging's port promises as DATA.
//
// PRIMARY OUTPUT: the Logger's methods return void — nothing data-shaped crosses the call
// site. The meaningful data that DOES cross the boundary is the structured log ENTRY the
// elementary+ sinks emit (one JSON line: ts + level + msg + merged fields), so that entry is
// what we contract. The forbidden rule encodes the redaction capability those grades carry:
// a secret-named field must never reach a sink with its raw value.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const entryShape = z
  .object({
    ts: z.string(),
    level: z.enum(['debug', 'info', 'warn', 'error']),
    msg: z.string(),
  })
  .loose() // base + call-site fields are merged into the entry

const SECRET_KEYS = new Set(['password', 'token', 'secret', 'authorization', 'api_key', 'apikey', 'cookie'])

export const CONTRACT: PortContract = {
  block: 'logging',
  output: entryShape,
  assertions: [
    {
      id: 'timestamped-at-emit',
      describe: 'every entry carries a parseable ISO-8601 ts stamped when the line was emitted',
      holds: (v) => !Number.isNaN(Date.parse((v as { ts: string }).ts)),
    },
  ],
  forbidden: [
    {
      id: 'no-raw-secret-fields',
      describe: 'a secret-named field (password/token/secret/authorization/api_key/cookie) must arrive redacted, never with its raw value',
      violatedBy: (v) =>
        Object.entries(v as Record<string, unknown>).some(([k, val]) => SECRET_KEYS.has(k.toLowerCase()) && val !== '[redacted]'),
    },
  ],
}

// A known-good output (one structured entry with a redacted secret) that CONTRACT must accept.
export const SAMPLE: unknown = {
  ts: '2026-06-12T10:00:00.000Z',
  level: 'info',
  msg: 'server started',
  port: 3000,
  token: '[redacted]',
}
