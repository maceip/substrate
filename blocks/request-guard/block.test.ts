// block.test.ts — request-guard invariants.  node blocks/request-guard/block.test.ts

import assert from 'node:assert/strict'
import { guard as memoryGuard } from './adapters/memory-fixed.ts'
import { guard as slidingGuard } from './adapters/sliding-shield.ts'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'

let failures = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`)
  }
}

console.log('\nrequest-guard block invariants:')

check('memory-fixed: allows up to limit, 429s beyond', () => {
  const mw = memoryGuard.create({ limit: 2, windowMs: 60_000 })
  const req = { headers: { 'x-client': 'a' } }
  assert.equal(mw(req), null)
  assert.equal(mw(req), null)
  assert.equal(mw(req)?.status, 429)
})

check('limits are per-key (different callers independent)', () => {
  const mw = memoryGuard.create({ limit: 1, windowMs: 60_000 })
  assert.equal(mw({ headers: { 'x-client': 'a' } }), null)
  assert.equal(mw({ headers: { 'x-client': 'a' } })?.status, 429)
  assert.equal(mw({ headers: { 'x-client': 'b' } }), null) // b unaffected
})

check('sliding-shield: rejects oversized body with 413 (shield)', () => {
  const mw = slidingGuard.create({ limit: 100, windowMs: 60_000, maxBytes: 1000 })
  assert.equal(mw({ headers: { 'content-length': '5000' } })?.status, 413)
  assert.equal(mw({ headers: { 'content-length': '10' } }), null)
})

check('gate escalation: public -> elementary; multi-instance -> graduated', () => {
  const base = { capabilities: new Set(['rate-limit', 'shield', 'distributed']), adapterGrade: 'graduated' as const }
  assert.equal(evaluate({ ...base, signals: { public: false, instances: 1 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { public: true, instances: 1 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { public: true, instances: 4 } }).requiredGrade, 'graduated')
})

check('under-grade caught: memory-fixed (no shield) is public', () => {
  const e = evaluate({ signals: { public: true, instances: 1 }, capabilities: new Set(['rate-limit']), adapterGrade: 'nursery' })
  assert.ok(e.underGraded)
  assert.ok(e.unmet.some((u) => u.requirement === 'shield'))
})

check('assertNoLoosening rejects gate removal', () => {
  assert.ok(assertNoLoosening(GATES, GATES.slice(0, 1)).length > 0)
})

console.log('')
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
