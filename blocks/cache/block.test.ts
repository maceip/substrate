// block.test.ts — invariants of the cache block. Dependency-free; run with node.
//   node cache/block.test.ts
//
// Proves the claims the block exists to make:
//   1. The port holds: the same app sequence yields the same result under every adapter.
//   2. TTL is a guarantee and single-flight coalesces a stampede.
//   3. The protected evaluator refuses loosening.

import assert from 'node:assert/strict'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { adapter as lru } from './adapters/lru.ts'

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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

console.log('\ncache block invariants:')

// 1. Port invariance: the same app sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
await check('port invariance: memory, lru and shared-file agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, CACHE_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  const memory = run('memory')
  assert.equal(memory, run('lru'), 'memory and lru diverged')
  assert.equal(memory, run('shared-file'), 'memory and shared-file diverged')
})

// TTL is a port guarantee: a 30ms entry checked at 0ms is served, at 90ms it is gone.
// Generous-but-short windows — nothing here races the wall clock by less than 50ms.
await check('TTL expiry: an entry past its TTL is never served', async () => {
  const c = await lru.open<string>('test_ttl')
  await c.set('k', 'v', 30)
  assert.equal(await c.get('k'), 'v')
  await sleep(90)
  assert.equal(await c.get('k'), undefined)
  await c.close()
})

// The stampede seam: 8 concurrent misses for one key must reach the source exactly once.
await check('single-flight: 8 concurrent getOrFill -> 1 fill', async () => {
  const c = await lru.open<string>('test_flight')
  let fills = 0
  const fill = async () => {
    fills++
    await sleep(40)
    return 'value'
  }
  const results = await Promise.all(Array.from({ length: 8 }, () => c.getOrFill('hot', fill, 10_000)))
  assert.ok(results.every((r) => r === 'value'))
  assert.equal(fills, 1, `expected 1 fill, source was hit ${fills} times`)
  await c.close()
})

// Bounded: at capacity the least-recently-used live entry is evicted, not the whole map.
await check('bounded-size: LRU eviction at maxEntries', async () => {
  const c = await lru.open<string>('test_bound', { maxEntries: 2 })
  await c.set('a', '1', 10_000)
  await c.set('b', '2', 10_000)
  await c.get('a') // refresh a — b becomes the LRU victim
  await c.set('c', '3', 10_000)
  assert.equal(await c.get('a'), '1')
  assert.equal(await c.get('b'), undefined)
  assert.equal(await c.get('c'), '3')
  await c.close()
})

// 2. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { prod: false, instances: 1, hotKeys: 0, fillCostMs: 5 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { prod: true, instances: 1, hotKeys: 0, fillCostMs: 5 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { prod: true, instances: 4, hotKeys: 20, fillCostMs: 250 } }).requiredGrade, 'graduated')
})

// 3. AEvo: loosening is rejected; tightening is allowed.
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
