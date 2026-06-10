// _fingerprint.ts — test helper. Runs a fixed pub/sub sequence against whatever adapter
// REALTIME_ADAPTER selects and prints a stable fingerprint of the observable result.
// Used by block.test.ts (and demo.ts) to assert port invariance across adapters.
//
// Delivery is awaited via a count-promise, not a sleep — deterministic under the in-process
// grades AND the SSE bridge. Per-topic arrays only: cross-topic interleaving is not part of
// the port's promise. `ts` is excluded (wall clock). No fromSeq here: the nursery grade has
// no replay, and this sequence must be identical at every grade.

import { open } from './index.ts'
import type { TopicEvent } from './index.ts'

function collector(expected: number) {
  const seen: string[] = []
  let resolve!: () => void
  const done = new Promise<void>((r) => (resolve = r))
  return {
    seen,
    done,
    push: (e: TopicEvent) => {
      seen.push(`${e.seq}:${String(e.data)}`)
      if (seen.length >= expected) resolve()
    },
  }
}

const ps = await open()
const alpha = collector(3)
const beta = collector(2)
const subA = await ps.subscribe('alpha', alpha.push)
const subB = await ps.subscribe('beta', beta.push)
for (const msg of ['a1', 'a2', 'a3']) await ps.publish('alpha', msg)
for (const msg of ['b1', 'b2']) await ps.publish('beta', msg)
await alpha.done
await beta.done
const topics = await ps.topics()
const counts = [await ps.subscriberCount('alpha'), await ps.subscriberCount('beta'), await ps.subscriberCount('ghost')]
subA.unsubscribe()
subB.unsubscribe()
await ps.close()

process.stdout.write(JSON.stringify({ alpha: alpha.seen, beta: beta.seen, topics, counts }))
