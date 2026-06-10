// demo.ts — a live-ticker demo built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Three acts:
//   1. the same pub/sub sequence fingerprinted under two adapters — identical output; that
//      is the port doing its job (subprocesses, because index.ts caches per process)
//   2. reconnect-with-replay: a subscriber drops, events keep flowing, it resumes from the
//      last seq it saw and misses nothing
//   3. the gate evaluator across three project lifecycles
//
//   node blocks/realtime/demo.ts
//   REALTIME_ADAPTER=emitter node blocks/realtime/demo.ts
//   REALTIME_ADAPTER=graduated node blocks/realtime/demo.ts

import { execFileSync } from 'node:child_process'
import { open, checkGrade, currentGrade } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== realtime block — adapter grade: ${grade} ===\n`)

// Act 1: port invariance — the fingerprint script publishes/subscribes through index.ts
// only; two different adapters produce byte-identical observable behavior.
const fingerprint = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, REALTIME_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
const emitterFp = fingerprint('emitter')
const bufferedFp = fingerprint('buffered')
console.log('port invariance (same app sequence, two adapters):')
console.log(`  emitter:  ${emitterFp}`)
console.log(`  buffered: ${bufferedFp}`)
console.log(`  identical: ${emitterFp === bufferedFp}`)

// Act 2: reconnect with replay. Only meaningful at a grade with the `replay` capability —
// at nursery the gate, not the demo, is what tells you it is missing.
if (grade === 'nursery') {
  console.log('\nreconnect-with-replay: skipped — nursery has no replay buffer (the gate below catches this)')
} else {
  console.log('\nreconnect-with-replay:')
  const ps = await open()
  const live: number[] = []
  let caughtThree!: () => void
  const firstThree = new Promise<void>((r) => (caughtThree = r))
  const sub = await ps.subscribe('ticker', (e) => {
    live.push(e.seq)
    console.log(`  live:     #${e.seq} ${e.data}`)
    if (live.length === 3) caughtThree()
  })
  for (const m of ['tick-1', 'tick-2', 'tick-3']) await ps.publish('ticker', m)
  await firstThree
  sub.unsubscribe()
  const lastSeen = live[live.length - 1]
  console.log(`  -- subscriber disconnects (last seen seq = ${lastSeen}); events keep flowing --`)
  await ps.publish('ticker', 'tick-4')
  await ps.publish('ticker', 'tick-5')
  const replayed: number[] = []
  let caughtUp!: () => void
  const resumed = new Promise<void>((r) => (caughtUp = r))
  const sub2 = await ps.subscribe(
    'ticker',
    (e) => {
      replayed.push(e.seq)
      console.log(`  replayed: #${e.seq} ${e.data}`)
      if (replayed.length === 2) caughtUp()
    },
    { fromSeq: lastSeen + 1 },
  )
  await resumed
  sub2.unsubscribe()
  await ps.close()
  console.log('  missed nothing: seqs', [...live, ...replayed].join(','))
}

// Act 3: the gate dashboard.
function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (1 subscriber, dev)        ', await checkGrade({ subscribers: 1, eventsPerDay: 50, prod: false, instances: 1 })))
console.log(fmt('launch  (40 subscribers, prod)     ', await checkGrade({ subscribers: 40, eventsPerDay: 5_000, prod: true, instances: 1 })))
console.log(fmt('scaled  (4 instances, 250k events) ', await checkGrade({ subscribers: 900, eventsPerDay: 250_000, prod: true, instances: 4 })))
console.log('')
