// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// PAYMENT_ADAPTER selects and prints a stable fingerprint of the observable result. Used by
// block.test.ts to assert port invariance across adapters. The provider grade's transport is
// FAKE — a canned charges/refunds API — so this runs with zero network and zero keys (the
// apiKey below is a placeholder string for the fake wire, not key material). Charge ids are
// random per run, so the fingerprint records BEHAVIOR (amounts, statuses, replay, balance),
// not raw ids; the file grade writes to an isolated ledger file it removes when done.

import { rm } from 'node:fs/promises'
import { open } from './index.ts'
import type { Transport } from './index.ts'

// Fake provider: settles any charge, refunds any amount — deterministic, no network.
const fakeProvider: Transport = async (url, init) => {
  const body = JSON.parse(init.body) as { amount?: number; currency?: string }
  if (url.endsWith('/charges')) {
    const id = `ch_fake_${(url.length + (body.amount ?? 0)).toString(36)}`
    return { status: 200, text: async () => JSON.stringify({ id, status: 'succeeded', amount: body.amount, currency: body.currency, amount_refunded: 0 }) }
  }
  // refund: url is /charges/<id>/refunds
  const amount = (body as { amount?: number }).amount ?? 0
  return { status: 200, text: async () => JSON.stringify({ id: 'ch_x', status: 'succeeded', amount: 0, currency: 'usd', amount_refunded: amount }) }
}

const adapter = process.env.PAYMENT_ADAPTER ?? 'file'
const ledgerFile = `fp_${process.pid}.json`
const rail = await open({ transport: fakeProvider, apiKey: 'placeholder-not-a-key', webhookSecret: 'placeholder-secret', ledgerFile })

// A charge, a duplicate with the SAME key (must replay one settlement), a partial refund.
const a = await rail.charge({ amount: 1299, currency: 'usd', idempotencyKey: 'order-7', customerRef: 'cust_1' })
const dup = await rail.charge({ amount: 1299, currency: 'usd', idempotencyKey: 'order-7', customerRef: 'cust_1' })
await rail.charge({ amount: 500, currency: 'usd', idempotencyKey: 'order-8', customerRef: 'cust_2' })
const refunded = await rail.refund(a.id, 299)
const balance = await rail.balance('usd')
const ledgerLen = (await rail.ledger()).length
await rail.close()

if (adapter === 'file') await rm(new URL(`./.data/${ledgerFile}`, import.meta.url), { force: true })

// Observable behavior only — ids differ per grade/run by design, the port promises behavior.
process.stdout.write(
  JSON.stringify({
    chargeAmount: a.amount,
    chargeStatus: a.status,
    dupReplayed: dup.replayed,
    dupSameAmount: dup.amount === a.amount,
    refundedStatus: refunded.status,
    refundedAmount: refunded.refundedAmount,
    balance: balance.settled, // 1299 - 299 + 500 = 1500
    ledgerLen, // 2 charges + 1 refund = 3
  }),
)
