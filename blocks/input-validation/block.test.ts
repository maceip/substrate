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
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`)
  }
}

console.log('\ninput-validation block invariants:')

await check('detailed: coerces numeric strings + booleans', () => {
  const r = parseDetailed(schema, { title: 'ok', priority: '3' })
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.value.priority, 3)
})

await check('detailed: per-field errors with reasons', () => {
  const r = parseDetailed(schema, { priority: 9 })
  assert.ok(!r.ok)
  if (!r.ok) {
    assert.ok(r.errors.some((e) => e.field === 'title' && e.message === 'required'))
    assert.ok(r.errors.some((e) => e.field === 'priority' && e.message.includes('<=')))
  }
})

await check('shape-check: rejects but only generically (nursery)', () => {
  const r = parseShape(schema, { priority: 9 })
  assert.ok(!r.ok)
  if (!r.ok) assert.ok(r.errors.every((e) => e.message === 'invalid'))
})

await check('gate escalation: public -> elementary; shared client -> graduated', () => {
  const base = { capabilities: new Set(['detailed-errors', 'coercion', 'shared-schema']), adapterGrade: 'graduated' as const }
  assert.equal(evaluate({ ...base, signals: { public: false, prod: false, sharedClient: false } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { public: true, prod: false, sharedClient: false } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { public: true, prod: true, sharedClient: true } }).requiredGrade, 'graduated')
})

await check('under-grade caught: shape-check is public', () => {
  const e = evaluate({ signals: { public: true, prod: true, sharedClient: false }, capabilities: new Set(), adapterGrade: 'nursery' })
  assert.ok(e.underGraded)
  assert.ok(e.unmet.some((u) => u.requirement === 'detailed-errors'))
})

// Regression (workdesk, Jun 2026): the middleware used to discard the coerced value, so
// handlers saw the raw body — `dir: 42` stayed a number and isAbsolute(42) threw a 500.
await check('validate() middleware: handler sees the coerced body, not the raw input', async () => {
  const { validate } = await import('./index.ts')
  const req = { body: { title: 'ok', priority: '3' } as unknown }
  const short = await validate(schema)(req)
  assert.equal(short, null)
  assert.equal((req.body as Record<string, unknown>).priority, 3)
})

await check('validate() middleware: bad body short-circuits 400 and leaves req.body untouched', async () => {
  const { validate } = await import('./index.ts')
  const raw = { priority: 9 }
  const req = { body: raw as unknown }
  const short = await validate(schema)(req)
  assert.equal(short?.status, 400)
  assert.equal(req.body, raw)
})

await check('assertNoLoosening rejects gate removal', () => {
  assert.ok(assertNoLoosening(GATES, GATES.slice(0, 1)).length > 0)
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
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
