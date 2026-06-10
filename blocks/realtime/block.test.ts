// block.test.ts — invariants of the realtime block. Dependency-free; run with node.
//   node realtime/block.test.ts
//
// Proves the claims the block exists to make:
//   1. The port holds: the same pub/sub sequence yields the same result under every adapter
//      — including the graduated SSE bridge.
//   2. Replay: a subscriber that reconnects with fromSeq gets what it missed, in order.
//   3. Backpressure: a blocked consumer costs bounded memory; the overflow policy fires.
//   4. The protected evaluator escalates and refuses loosening.

import assert from 'node:assert/strict'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { adapter as buffered } from './adapters/buffered.ts'

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

console.log('\nrealtime block invariants:')

// 1. Port invariance: the same pub/sub sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
await check('port invariance: emitter, buffered and graduated agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, REALTIME_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  const emitter = run('emitter')
  assert.equal(emitter, run('buffered'), 'emitter and buffered diverged')
  assert.equal(emitter, run('graduated'), 'emitter and graduated diverged')
})

// 2. Replay: events published BEFORE the subscription arrive via fromSeq, in order. This is
//    the reconnect seam: a consumer resumes from the last seq it saw and misses nothing.
await check('replay: subscribe with fromSeq delivers missed events in order', async () => {
  const ps = await buffered.open()
  await ps.publish('room', 'one')
  await ps.publish('room', 'two')
  await ps.publish('room', 'three')
  const seen: string[] = []
  let resolve!: () => void
  const done = new Promise<void>((r) => (resolve = r))
  await ps.subscribe(
    'room',
    (e) => {
      seen.push(`${e.seq}:${String(e.data)}`)
      if (seen.length === 2) resolve()
    },
    { fromSeq: 2 },
  )
  await done
  assert.deepEqual(seen, ['2:two', '3:three'])
  await ps.close()
})

// 3. Backpressure: a consumer that never finishes must not grow memory without bound. The
//    queue holds at its bound and the drop-oldest overflow policy fires — observably. Counts
//    are exact: event 1 is in-flight forever, the last 4 are queued, the 15 between dropped.
await check('backpressure: blocked consumer -> bounded queue, overflow policy fires', async () => {
  const ps = await buffered.open()
  const sub = await ps.subscribe('firehose', () => new Promise<void>(() => {}), { maxQueue: 4 })
  for (let i = 1; i <= 20; i++) await ps.publish('firehose', i)
  const stats = sub.stats()
  assert.equal(stats.queued, 4, `queue exceeded its bound (queued=${stats.queued})`)
  assert.equal(stats.dropped, 15, `overflow policy did not fire as stated (dropped=${stats.dropped})`)
  assert.equal(stats.delivered, 0)
  sub.unsubscribe()
  await ps.close()
})

// 4. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { subscribers: 1, eventsPerDay: 10, prod: false, instances: 1 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { subscribers: 5, eventsPerDay: 10, prod: false, instances: 1 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { subscribers: 5, eventsPerDay: 200_000, prod: true, instances: 3 } }).requiredGrade, 'graduated')
})

// 5. AEvo: loosening is rejected; tightening is allowed.
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
