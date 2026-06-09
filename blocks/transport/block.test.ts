// block.test.ts — transport block invariants.  node blocks/transport/block.test.ts

import assert from 'node:assert/strict'
import { makeRouter } from './adapters/_router.ts'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'

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

console.log('\ntransport block invariants:')

await check('routing: exact + param match via in-process handle', async () => {
  const r = makeRouter(true)
  r.route('GET', '/items/:id', (req) => ({ status: 200, body: { id: req.params.id } }))
  const res = await r.handle('GET', '/items/42')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { id: '42' })
})

await check('routing: unmatched path -> 404', async () => {
  const r = makeRouter(true)
  const res = await r.handle('GET', '/nope')
  assert.equal(res.status, 404)
})

await check('middleware honored at elementary, short-circuits', async () => {
  const r = makeRouter(true)
  r.use((req) => (req.headers['x-block'] ? { status: 403, body: { blocked: true } } : null))
  r.route('GET', '/x', () => ({ status: 200, body: 'ok' }))
  assert.equal((await r.handle('GET', '/x', { headers: { 'x-block': '1' } })).status, 403)
  assert.equal((await r.handle('GET', '/x')).status, 200)
})

await check('middleware NOT honored at nursery (capability absent)', async () => {
  const r = makeRouter(false)
  r.use(() => ({ status: 403, body: { blocked: true } }))
  r.route('GET', '/x', () => ({ status: 200, body: 'ok' }))
  assert.equal((await r.handle('GET', '/x')).status, 200) // middleware ignored -> the gate is the safety net
})

await check('real socket: listen + fetch round-trip', async () => {
  const r = makeRouter(true)
  r.route('GET', '/ping', () => ({ status: 200, body: { pong: true } }))
  const l = await r.listen(0)
  const res = await fetch(`${l.url}/ping`)
  const json = await res.json()
  await l.close()
  assert.equal(res.status, 200)
  assert.equal(json.pong, true)
})

await check('gate escalation: public -> elementary; multi-instance -> graduated', () => {
  const base = { capabilities: new Set<string>(['routing', 'middleware', 'graceful-shutdown', 'streaming']), adapterGrade: 'graduated' as const }
  assert.equal(evaluate({ ...base, signals: { public: false, prod: false, instances: 1 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { public: true, prod: false, instances: 1 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { public: true, prod: true, instances: 4 } }).requiredGrade, 'graduated')
})

await check('under-grade caught: nursery server is public', () => {
  const e = evaluate({ signals: { public: true, prod: true, instances: 1 }, capabilities: new Set(['routing']), adapterGrade: 'nursery' })
  assert.ok(e.underGraded)
  assert.ok(e.unmet.some((u) => u.requirement === 'boundary-pipeline'))
})

await check('assertNoLoosening rejects gate removal', () => {
  assert.ok(assertNoLoosening(GATES, GATES.slice(0, 1)).length > 0)
})

console.log('')
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
