// contract.ts — PROTOCOL S7: payment's port promises as DATA.
//
// PRIMARY OUTPUT: the Charge that charge()/refund()/getCharge() hand to consumers. The
// port's value-shaped guarantees: money is INTEGER MINOR UNITS (cents, never a float), the
// refunded amount never exceeds the charged amount and always agrees with the status, and
// customerRef is the app's own id — never card/PAN material.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const chargeShape = z.object({
  id: z.string().min(1),
  status: z.enum(['settled', 'refunded', 'partially_refunded', 'failed']),
  amount: z.number().int().min(0),
  currency: z.string().min(1),
  refundedAmount: z.number().int().min(0),
  idempotencyKey: z.string().min(1),
  customerRef: z.string().min(1),
  createdAt: z.string(),
  replayed: z.boolean(),
})

type Ch = { status: string; amount: number; refundedAmount: number; customerRef: string }

export const CONTRACT: PortContract = {
  block: 'payment',
  output: chargeShape,
  assertions: [
    {
      id: 'integer-minor-units',
      describe: 'amount and refundedAmount are non-negative INTEGER minor units (cents) — money is never a float, so cents cannot drift',
      holds: (v) => {
        const r = v as Ch
        return Number.isInteger(r.amount) && r.amount >= 0 && Number.isInteger(r.refundedAmount) && r.refundedAmount >= 0
      },
    },
    {
      id: 'status-matches-refunded-amount',
      describe: "refundedAmount agrees with status: 0 for 'settled'/'failed', equal to amount for 'refunded', strictly between for 'partially_refunded'",
      holds: (v) => {
        const r = v as Ch
        if (r.status === 'refunded') return r.refundedAmount === r.amount
        if (r.status === 'partially_refunded') return r.refundedAmount > 0 && r.refundedAmount < r.amount
        return r.refundedAmount === 0
      },
    },
  ],
  forbidden: [
    {
      id: 'no-pan-in-customer-ref',
      describe: 'customerRef is the app\'s own customer id — a 13-19 digit run (card/PAN-shaped material) must never appear in it',
      violatedBy: (v) => /\d{13,19}/.test((v as Ch).customerRef),
    },
  ],
}

// A known-good output (a fresh settled charge of $25.00) that CONTRACT must accept.
export const SAMPLE: unknown = {
  id: 'ch_01HZX4N2',
  status: 'settled',
  amount: 2500,
  currency: 'usd',
  refundedAmount: 0,
  idempotencyKey: 'order-8841-attempt-1',
  customerRef: 'cust_42',
  createdAt: '2026-06-12T10:00:00.000Z',
  replayed: false,
}
