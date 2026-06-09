// block.test.ts — logging block invariants.  node blocks/logging/block.test.ts

import assert from 'node:assert/strict'
import { makeStructured } from './adapters/structured.ts'
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

console.log('\nlogging block invariants:')

check('structured: emits valid JSON with level + msg', () => {
  const out: string[] = []
  const log = makeStructured((s) => out.push(s))
  log.info('hello', { a: 1 })
  const rec = JSON.parse(out[0])
  assert.equal(rec.level, 'info')
  assert.equal(rec.msg, 'hello')
  assert.equal(rec.a, 1)
})

check('structured: redacts secret-looking fields', () => {
  const out: string[] = []
  const log = makeStructured((s) => out.push(s))
  log.error('x', { password: 'hunter2', token: 'abc', keep: 'ok' })
  const rec = JSON.parse(out[0])
  assert.equal(rec.password, '[redacted]')
  assert.equal(rec.token, '[redacted]')
  assert.equal(rec.keep, 'ok')
})

check('structured: child merges base fields', () => {
  const out: string[] = []
  const log = makeStructured((s) => out.push(s), { service: 's' }).child({ requestId: 'r' })
  log.info('y')
  const rec = JSON.parse(out[0])
  assert.equal(rec.service, 's')
  assert.equal(rec.requestId, 'r')
})

check('gate escalation: prod -> elementary; multi-instance -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'graduated' as const }
  assert.equal(evaluate({ ...base, signals: { prod: false, instances: 1 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { prod: true, instances: 1 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { prod: true, instances: 4 } }).requiredGrade, 'graduated')
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
