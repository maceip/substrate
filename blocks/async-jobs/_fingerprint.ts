// _fingerprint.ts — test helper. Runs a fixed job sequence against whatever adapter
// JOBS_ADAPTER selects and prints a stable fingerprint of the observable result.
// Used by block.test.ts to assert port invariance across adapters.
//
// What is fingerprinted is what the PORT guarantees: the terminal state, result, error
// presence, and dead-letter membership behind each job id. Attempt counts are grade-visible
// diagnostics (an adapter with retries tries more than once) and are deliberately excluded.

import { open } from './index.ts'

const q = await open('test_jobs')
await q.purge() // a durable adapter may carry terminal jobs from a previous run

q.register('double', (n) => (n as number) * 2)
q.register('always-fails', () => {
  throw new Error('boom')
})

const a = await q.enqueue('double', 21)
const b = await q.enqueue('double', 4, { delayMs: 10 })
const c = await q.enqueue('always-fails', { feed: 'x' })
await q.drain()

const recs = [await q.status(a), await q.status(b), await q.status(c)]
const dead = (await q.deadLetters()).map((j) => j.name).sort()
const fp = {
  jobs: recs.map((r) => ({ name: r!.name, state: r!.state, result: r!.result, hasError: r!.error !== null })),
  dead,
}
await q.purge() // leave clean
await q.close()

process.stdout.write(JSON.stringify(fp))
