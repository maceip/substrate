// contract.ts — PROTOCOL S7: files' port promises as DATA.
//
// PRIMARY OUTPUT: the ObjectStat that put()/stat() hand to consumers. Two port guarantees
// are value-shaped and live here: the etag IS the sha256 of the bytes (every grade reports
// the same etag for the same bytes), and the key obeys the shared assertValidKey guard (the
// key the app wrote with is the key every grade reads with).

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'
import { assertValidKey } from './port.ts'

const statShape = z.object({
  key: z.string().min(1),
  size: z.number().int().min(0),
  etag: z.string(),
  contentType: z.string().min(1),
})

export const CONTRACT: PortContract = {
  block: 'files',
  output: statShape,
  assertions: [
    {
      id: 'etag-is-sha256-hex',
      describe: 'etag is the sha256 of the bytes: 64 lowercase hex chars — the stable integrity/dedup hook at every grade',
      holds: (v) => /^[0-9a-f]{64}$/.test((v as { etag: string }).etag),
    },
    {
      id: 'key-passes-shared-guard',
      describe: 'the reported key satisfies assertValidKey (namespaced path; no NUL/backslash/dot segments) — no grade serves a key another grade would reject',
      holds: (v) => {
        try {
          assertValidKey((v as { key: string }).key)
          return true
        } catch {
          return false
        }
      },
    },
  ],
  forbidden: [],
}

// A known-good output (the stat of a small PNG; etag = sha256('Hello World')) that CONTRACT
// must accept.
export const SAMPLE: unknown = {
  key: 'avatars/u1/profile.png',
  size: 11,
  etag: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
  contentType: 'image/png',
}
