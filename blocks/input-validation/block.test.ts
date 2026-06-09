// block.test.ts — input-validation invariants.  node blocks/input-validation/block.test.ts

import assert from 'node:assert/strict'
import { parseShape } from './adapters/shape-check.ts'
import { parseDetailed } from './adapters/detailed.ts'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import type { Schema } from './port.ts'

const schema: Schema = {
  title: { type: 'string', required: true, min: 1, max: 5 },
  priority: { type: 'number', min: 1, max: 5 },
}

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

console.log('\ninput-validation block invariants:')

check('detailed: coerces numeric strings + booleans', () => {
  const r = parseDetailed(schema, { title: 'ok', priority: '3' })
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.value.priority, 3)
})

check('detailed: per-field errors with reasons', () => {
  const r = parseDetailed(schema, { priority: 9 })
  assert.ok(!r.ok)
  if (!r.ok) {
    assert.ok(r.errors.some((e) => e.field === 'title' && e.message === 'required'))
    assert.ok(r.errors.some((e) => e.field === 'priority' && e.message.includes('<=')))
  }
})

check('shape-check: rejects but only generically (nursery)', () => {
  const r = parseShape(schema, { priority: 9 })
  assert.ok(!r.ok)
  if (!r.ok) assert.ok(r.errors.every((e) => e.message === 'invalid'))
})

check('gate escalation: public -> elementary; shared client -> graduated', () => {
  const base = { capabilities: new Set(['detailed-errors', 'coercion', 'shared-schema']), adapterGrade: 'graduated' as const }
  assert.equal(evaluate({ ...base, signals: { public: false, prod: false, sharedClient: false } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { public: true, prod: false, sharedClient: false } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { public: true, prod: true, sharedClient: true } }).requiredGrade, 'graduated')
})

check('under-grade caught: shape-check is public', () => {
  const e = evaluate({ signals: { public: true, prod: true, sharedClient: false }, capabilities: new Set(), adapterGrade: 'nursery' })
  assert.ok(e.underGraded)
  assert.ok(e.unmet.some((u) => u.requirement === 'detailed-errors'))
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
