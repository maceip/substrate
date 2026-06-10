// block.test.ts — invariants of the payment block. Dependency-free; run with node.
//   node payment/block.test.ts
//
// Proves the claims the block exists to make — with a FAKE transport throughout, so the whole
// file runs with zero network and zero keys (the apiKey/secret strings below are placeholders
// for the fake wire, never key material; nothing logs card/secret values):
//   1. The port holds: the same app sequence yields the same result under every adapter.
//   2. charge() is IDEMPOTENT: two charges with the same key settle ONCE; balance reflects one.
//   3. Money is integer minor units: amounts are integers, no float drift across a refund.
//   4. Webhook handling is fail-closed at the grade that requires it: bad signature rejected.
//   5. The protected evaluator refuses loosening.

import assert from 'node:assert/strict'
import { rm } from 'node:fs/promises'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { adapter as memory } from './adapters/memory.ts'
import { adapter as file } from './adapters/file.ts'
import { adapter as graduated } from './adapters/graduated.ts'
import { computeWebhookSignature } from './adapters/_wire.ts'
import type { Transport } from './port.ts'

let failures = 0
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((e) => {
      failures++
      console.log(`  ✗ ${name}\n      ${e.message}`)
    })
}

const PLACEHOLDER_KEY = 'placeholder-not-a-key'
const PLACEHOLDER_SECRET = 'placeholder-webhook-secret'

// Fake provider: settles charges, refunds amounts — deterministic, no network.
const fakeProvider: Transport = async (url, init) => {
  const body = JSON.parse(init.body) as { amount?: number; currency?: string }
  if (url.endsWith('/charges'))
    return { status: 200, text: async () => JSON.stringify({ id: `ch_fake_${Math.random().toString(36).slice(2)}`, status: 'succeeded', amount: body.amount, currency: body.currency, amount_refunded: 0 }) }
  const amount = body.amount ?? 0
  return { status: 200, text: async () => JSON.stringify({ id: 'ch_x', status: 'succeeded', amount: 0, currency: 'usd', amount_refunded: amount }) }
}

console.log('\npayment block invariants:')

// 1. Port invariance: the same app sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
//    The fingerprint's transport is fake — no network, no keys, deterministic responses.
await check('port invariance: memory, file and graduated agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, PAYMENT_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  const memory = run('memory')
  assert.equal(memory, run('file'), 'memory and file diverged')
  assert.equal(memory, run('graduated'), 'memory and graduated diverged')
})

// 2. IDEMPOTENCY: two charges with the same idempotencyKey settle ONCE — the second replays
//    the first, the ledger has one charge entry, and the balance reflects a single settlement.
//    This is the seam that prevents the classic double-charge bug. Proven at every grade.
await check('idempotency: same key -> one settlement, balance reflects one (all adapters)', async () => {
  for (const [name, adapter] of [['memory', memory], ['file', file], ['graduated', graduated]] as const) {
    const ledgerFile = `idem_${name}.json`
    const rail = await adapter.open({ transport: fakeProvider, apiKey: PLACEHOLDER_KEY, ledgerFile })
    const req = { amount: 2000, currency: 'usd', idempotencyKey: 'order-dup', customerRef: 'c1' }
    const first = await rail.charge(req)
    const second = await rail.charge(req) // same key — a retry / double-click
    assert.equal(first.replayed, false, `${name}: first charge should not be a replay`)
    assert.equal(second.replayed, true, `${name}: second charge with the same key MUST be a replay`)
    assert.equal(second.id, first.id, `${name}: replay must return the FIRST charge, not a new one`)
    const charges = (await rail.ledger()).filter((e) => e.kind === 'charge')
    assert.equal(charges.length, 1, `${name}: expected ONE charge entry, found ${charges.length} — double-charge!`)
    assert.equal((await rail.balance('usd')).settled, 2000, `${name}: balance must reflect a single settlement`)
    await rail.close()
    if (name === 'file') await rm(new URL(`./.data/${ledgerFile}`, import.meta.url), { force: true })
  }
})

// 3. INTEGER MONEY: amounts are integers and survive a refund with no float drift. A
//    fractional amount is rejected at the port before any adapter settles it.
await check('integer money: amounts are integers, no float drift across a refund', async () => {
  const rail = await memory.open()
  const charge = await rail.charge({ amount: 1000, currency: 'usd', idempotencyKey: 'k-int', customerRef: 'c1' })
  await rail.refund(charge.id, 333)
  await rail.refund(charge.id, 333)
  const remaining = (await rail.balance('usd')).settled
  assert.equal(remaining, 1000 - 333 - 333, 'balance drifted') // 334, exact integer arithmetic
  assert.ok(Number.isInteger(remaining), 'balance is not an integer')
  for (const e of await rail.ledger()) assert.ok(Number.isInteger(e.amount), 'a ledger entry is not an integer')
  // a fractional charge is rejected at the port — it never reaches the adapter's settlement.
  await assert.rejects(() => rail.charge({ amount: 9.99, currency: 'usd', idempotencyKey: 'k-float', customerRef: 'c1' }), /integer number of minor units/)
  await rail.close()
})

// 4. WEBHOOK FAIL-CLOSED at the grade that requires it (graduated declares 'webhook-verified').
//    A canned signed payload verifies; a bad signature and an absent signature are REJECTED
//    (throw) — the event is never returned, so it can never be processed.
await check('webhook fail-closed: graduated rejects a bad/absent signature, accepts a valid one', async () => {
  const rail = await graduated.open({ transport: fakeProvider, apiKey: PLACEHOLDER_KEY, webhookSecret: PLACEHOLDER_SECRET })
  const rawBody = JSON.stringify({ id: 'evt_1', type: 'charge.settled', chargeId: 'ch_1' })
  const goodSig = computeWebhookSignature(PLACEHOLDER_SECRET, rawBody) // the canned signed payload
  const event = await rail.handleWebhook(rawBody, goodSig)
  assert.equal(event.verified, true)
  assert.equal(event.type, 'charge.settled')
  await assert.rejects(() => rail.handleWebhook(rawBody, 'deadbeef'.repeat(8)), /bad signature/, 'a forged signature must be rejected')
  await assert.rejects(() => rail.handleWebhook(rawBody, undefined), /missing signature/, 'an absent signature must be rejected')
  await rail.close()
})

// 5. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { prod: false, realMoney: false, chargesPerDay: 5, multiCurrency: false } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { prod: true, realMoney: true, chargesPerDay: 5, multiCurrency: false } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { prod: true, realMoney: true, chargesPerDay: 5_000, multiCurrency: true } }).requiredGrade, 'graduated')
})

// 6. AEvo: loosening is rejected; tightening is allowed.
await check('assertNoLoosening: removing a gate is a violation', () => {
  const loosened = GATES.slice(0, 1) // dropped the graduated gate
  assert.ok(assertNoLoosening(GATES, loosened).length > 0)
})
await check('assertNoLoosening: adding a gate is allowed (tightening)', () => {
  const tightened = [...GATES, { ...GATES[0], id: 'gate:extra' }]
  assert.equal(assertNoLoosening(GATES, tightened).length, 0)
})

// AEvo armed: the live gates may not loosen the baseline committed at git HEAD
// (block.json). Tightening passes; loosening fails until a human commits it.
await check('PROTECTED: live gates do not loosen the committed baseline', async () => {
  const { checkProtection } = await import('../_kernel/protect.ts')
  const res = checkProtection(new URL('.', import.meta.url).pathname, GATES)
  if (res.baseline === 'none') return console.log('      (no committed baseline yet — protection arms on first commit)')
  assert.deepEqual(res.violations, [])
})

console.log('')
if (failures > 0) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
