// contract.ts — PROTOCOL S7: edge-model's port promises as DATA.
//
// PRIMARY OUTPUT: the FetchResult that fetch(ref) reports — the acquired artifact's place in
// the content-addressed cache. The value-shaped half of the CONTENT-ADDRESSED CACHE
// guarantee lives here: sha256 is the hex digest of the bytes (the integrity hook every
// grade exposes), and `cached` says whether the transport was skipped. (Convert idempotence
// and run determinism are behavioral, proven by block.test.ts, not by one value.)

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const fetchResultShape = z.object({
  path: z.string().min(1),
  bytes: z.number().int().min(0),
  sha256: z.string(),
  cached: z.boolean(),
})

export const CONTRACT: PortContract = {
  block: 'edge-model',
  output: fetchResultShape,
  assertions: [
    {
      id: 'sha256-is-hex-digest',
      describe: 'sha256 is a 64-char lowercase hex digest of the artifact bytes — the integrity hook that makes corruption detectable on load',
      holds: (v) => /^[0-9a-f]{64}$/.test((v as { sha256: string }).sha256),
    },
  ],
  forbidden: [],
}

// A known-good output (a first fetch landing in the content-addressed cache) that CONTRACT
// must accept.
export const SAMPLE: unknown = {
  path: '.data/cache/2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824.bin',
  bytes: 5,
  sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  cached: false,
}
