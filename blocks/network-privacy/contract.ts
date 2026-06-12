// contract.ts — PROTOCOL S7: network-privacy's port promises as DATA.
//
// PRIMARY OUTPUT: the three values the port ever returns — Registration (register), Receipt
// (send), Envelope (recv). THE GUARANTEE this block exists for is the forbidden rule: no
// output value may contain a dialable address (scheme://, ip:port, host:port) — the deep-scan
// invariant block.test.ts proves adversarially, encoded here as data so the attribution
// walker can check any port value mechanically. Handles are 32 hex chars of CSPRNG output
// (HANDLE_SHAPE), never an encoding of where a peer lives.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'
import { HANDLE_SHAPE } from './port.ts'

const registrationShape = z.object({ handle: z.string() })
const receiptShape = z.object({ id: z.string().min(1), nonce: z.string().min(1) })
const envelopeShape = z.object({ from: z.string(), payload: z.string(), nonce: z.string().min(1) })
const outputShape = z.union([registrationShape, envelopeShape, receiptShape])

// Dialable-address patterns: a URI scheme, an IPv4 (with or without port), a host:port tail.
const DIALABLE = [
  /[a-z][a-z0-9+.-]*:\/\//i, // scheme:// — tcp://, http://, ws://, ...
  /\b\d{1,3}(?:\.\d{1,3}){3}(?::\d{1,5})?\b/, // IPv4, optionally with port
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)+:\d{1,5}\b/i, // host.name:port
]

function containsDialable(v: unknown): boolean {
  if (typeof v === 'string') return DIALABLE.some((re) => re.test(v))
  if (Array.isArray(v)) return v.some(containsDialable)
  if (v && typeof v === 'object') return Object.values(v).some(containsDialable)
  return false
}

export const CONTRACT: PortContract = {
  block: 'network-privacy',
  output: outputShape,
  assertions: [
    {
      id: 'handles-are-opaque-32hex',
      describe: 'every peer name (`handle` on a Registration, `from` on an Envelope) matches HANDLE_SHAPE — 32 hex chars of CSPRNG output, non-reversible by construction',
      holds: (v) => {
        const r = v as { handle?: unknown; from?: unknown }
        if (r.handle !== undefined && !(typeof r.handle === 'string' && HANDLE_SHAPE.test(r.handle))) return false
        if (r.from !== undefined && !(typeof r.from === 'string' && HANDLE_SHAPE.test(r.from))) return false
        return true
      },
    },
  ],
  forbidden: [
    {
      id: 'no-dialable-address',
      describe: 'THE GUARANTEE: no output value contains a dialable address (scheme://, ip:port, host:port) anywhere in its string graph — storing a peer address is unrepresentable above the port',
      violatedBy: containsDialable,
    },
  ],
}

// A known-good output (an Envelope drained by recv: sender named by opaque handle only)
// that CONTRACT must accept.
export const SAMPLE: unknown = {
  from: '9f3b2a6c0d4e8f1a7b5c3d2e6f0a9b8c',
  payload: 'meet at the usual place',
  nonce: 'c4a1e7f2b9d05368',
}
