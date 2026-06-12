// contract.ts — PROTOCOL S7: attestation's port promises as DATA.
//
// PRIMARY OUTPUT: the VerifyResult that verify() hands to consumers — the fail-closed value
// app code branches on. The shape IS the guarantee: `claim` is present ONLY when valid (the
// verified copy, safe to act on); `reason` is present ONLY when invalid. There is no third
// state, and no path where an unverified claim reaches a consumer.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const claimShape = z.object({
  subject: z.string().min(1),
  statement: z.string().min(1),
  issuedAt: z.string(),
  expiresAt: z.string().optional(),
})

const verifyResultShape = z.object({
  valid: z.boolean(),
  claim: claimShape.optional(),
  reason: z.string().optional(),
})

type VR = { valid: boolean; claim?: unknown; reason?: unknown }

export const CONTRACT: PortContract = {
  block: 'attestation',
  output: verifyResultShape,
  assertions: [
    {
      id: 'valid-carries-verified-claim',
      describe: 'a valid result carries the verified claim copy and no reason; an invalid result names a non-empty reason',
      holds: (v) => {
        const r = v as VR
        if (r.valid) return r.claim !== undefined && r.reason === undefined
        return typeof r.reason === 'string' && r.reason.length > 0
      },
    },
  ],
  forbidden: [
    {
      id: 'no-claim-on-invalid',
      describe: 'an invalid result must not hand back a claim — fail-closed means a consumer can never act on an unverified claim',
      violatedBy: (v) => {
        const r = v as VR
        return r.valid === false && r.claim !== undefined
      },
    },
  ],
}

// A known-good output (a successful verification with the verified claim copy) that CONTRACT
// must accept.
export const SAMPLE: unknown = {
  valid: true,
  claim: {
    subject: 'artifact:app-v1.4.2',
    statement: 'built from commit 6b1aff3 by ci',
    issuedAt: '2026-06-12T10:00:00.000Z',
    expiresAt: '2026-07-12T10:00:00.000Z',
  },
}
