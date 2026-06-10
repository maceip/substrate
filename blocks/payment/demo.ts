// demo.ts — a tiny checkout app built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Run it under different
// PAYMENT_ADAPTER values and the app code is byte-for-byte identical — that is the port
// doing its job. It charges, charges AGAIN with the same idempotency key to prove ONE
// settlement, refunds, reads the balance off the ledger, shows the adapter swap (the same
// sequence fingerprinted under every grade), and runs the gate evaluator across three
// project lifecycles. Zero network, zero keys: the provider grade is fed a fake transport.
//
//   node blocks/payment/demo.ts
//   PAYMENT_ADAPTER=memory node blocks/payment/demo.ts
//   PAYMENT_ADAPTER=graduated node blocks/payment/demo.ts

import { rm } from 'node:fs/promises'
import { open, checkGrade, currentGrade } from './index.ts'
import type { Transport } from './index.ts'

// Fake provider so the graduated grade runs offline; the in-memory/file grades ignore it.
const fakeProvider: Transport = async (url, init) => {
  const body = JSON.parse(init.body) as { amount?: number; currency?: string }
  if (url.endsWith('/charges'))
    return { status: 200, text: async () => JSON.stringify({ id: `ch_demo_${Date.now()}`, status: 'succeeded', amount: body.amount, currency: body.currency, amount_refunded: 0 }) }
  const amount = (body as { amount?: number }).amount ?? 0
  return { status: 200, text: async () => JSON.stringify({ id: 'ch_demo', status: 'succeeded', amount: 0, currency: 'usd', amount_refunded: amount }) }
}

const grade = await currentGrade()
console.log(`\n=== payment block — adapter grade: ${grade} ===\n`)

// one isolated ledger per run so the demo is idempotent across re-runs (the file grade only).
const ledgerFile = 'demo_ledger.json'
const rail = await open({ transport: fakeProvider, apiKey: 'placeholder-not-a-key', webhookSecret: 'demo-secret', ledgerFile })

// charge: the domain action. amount is integer minor units (cents) — $12.99 is 1299.
const order = await rail.charge({ amount: 1299, currency: 'usd', idempotencyKey: 'order-42', customerRef: 'cust_alice', description: 'Pro plan' })
console.log('charge:')
console.log(`  ${order.id}  ${order.status}  ${order.amount} ${order.currency} (cents)  replayed:${order.replayed}`)

// the SAME idempotency key again — a retry / double-click. ONE settlement, not two.
const retry = await rail.charge({ amount: 1299, currency: 'usd', idempotencyKey: 'order-42', customerRef: 'cust_alice', description: 'Pro plan' })
console.log('\nduplicate charge (same idempotencyKey — the double-charge cure):')
console.log(`  ${retry.id}  replayed:${retry.replayed}  -> same charge as before: ${retry.id === order.id}`)

// refund part of it — recorded as a negative ledger entry, integer cents.
const refunded = await rail.refund(order.id, 299)
console.log('\nrefund (partial, 299 cents):')
console.log(`  status:${refunded.status}  refundedAmount:${refunded.refundedAmount} cents`)

// balance: the SUM of ledger entries (1299 charged - 299 refunded = 1000), never a float.
const balance = await rail.balance('usd')
const ledger = await rail.ledger()
console.log('\nledger read (balance is the SUM of entries):')
console.log(`  ${ledger.length} entries  balance: ${balance.settled} ${balance.currency} (cents)`)

await rail.close()
if (grade === 'elementary') await rm(new URL(`./.data/${ledgerFile}`, import.meta.url), { force: true })

// adapter swap: the SAME sequence, fingerprinted under every grade in a subprocess.
const { execFileSync } = await import('node:child_process')
const fp = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, PAYMENT_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
console.log('\nadapter swap (identical observable behavior — charge IDS differ, behavior does not):')
for (const a of ['memory', 'file', 'graduated']) console.log(`  ${a.padEnd(9)} ${fp(a)}`)

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (dev sandbox, no real money)      ', await checkGrade({ prod: false, realMoney: false, chargesPerDay: 5, multiCurrency: false })))
console.log(fmt('month 2 (prod, real money, 200 charges/day)', await checkGrade({ prod: true, realMoney: true, chargesPerDay: 200, multiCurrency: false })))
console.log(fmt('month 9 (5k charges/day, multi-currency)   ', await checkGrade({ prod: true, realMoney: true, chargesPerDay: 5_000, multiCurrency: true })))
console.log('')
