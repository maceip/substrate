// adapters/retry.ts — ELEMENTARY grade (the DEFAULT for real projects)
//
// A single in-process worker driven by a timer tick. Failed jobs are re-queued with a
// linear backoff until maxAttempts is exhausted, then quarantined in the dead-letter
// list — that earns the `retries` + `dead-letter` capabilities the nursery->elementary
// gate's requirements check for. Still one process and an in-memory queue (a restart
// loses queued jobs), so it tops out at `elementary`. App code does not change one
// character moving here from inline.

import type { Adapter, EnqueueOptions, JobHandler, JobQueue, JobRecord } from '../port.ts'

const TICK_MS = 5

// Internal bookkeeping rides along on the record; a retry is just a re-queue with
// `runAfter` pushed into the future. Structurally still a JobRecord, so status() is free.
interface Tracked extends JobRecord {
  maxAttempts: number
  backoffMs: number
  runAfter: number // epoch ms — do not start before this
}

class RetryQueue implements JobQueue {
  private handlers = new Map<string, JobHandler>()
  private jobs = new Map<string, Tracked>()
  private busy = false // single worker: one job at a time (concurrency is a graduated capability)
  private interval: NodeJS.Timeout

  constructor() {
    // unref'd so a forgotten close() can never hold the process open; drain()'s own
    // (deliberately ref'd) polling keeps the loop alive while there is work to wait for.
    this.interval = setInterval(() => void this.tick(), TICK_MS)
    this.interval.unref()
  }

  register(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler)
  }

  async enqueue(name: string, payload: unknown = null, opts: EnqueueOptions = {}): Promise<string> {
    if (!this.handlers.has(name)) throw new Error(`no handler registered for job '${name}'`)
    const rec: Tracked = {
      id: crypto.randomUUID(),
      name,
      state: 'queued',
      attempts: 0,
      payload,
      result: null,
      error: null,
      enqueued_at: new Date().toISOString(),
      finished_at: null,
      maxAttempts: opts.maxAttempts ?? 3,
      backoffMs: opts.backoffMs ?? 25,
      runAfter: Date.now() + (opts.delayMs ?? 0),
    }
    this.jobs.set(rec.id, rec)
    return rec.id
  }

  // The worker loop: pick one due job, run it, and on failure either re-queue with backoff
  // or dead-letter it. This is the whole difference between elementary and nursery.
  private async tick(): Promise<void> {
    if (this.busy) return
    const now = Date.now()
    const job = [...this.jobs.values()].find((j) => j.state === 'queued' && j.runAfter <= now)
    if (!job) return
    const handler = this.handlers.get(job.name)
    if (!handler) return
    this.busy = true
    job.state = 'running'
    job.attempts++
    try {
      job.result = (await handler(job.payload)) ?? null
      job.state = 'succeeded'
      job.finished_at = new Date().toISOString()
    } catch (e) {
      job.error = e instanceof Error ? e.message : String(e)
      if (job.attempts >= job.maxAttempts) {
        job.state = 'dead' // retries exhausted: quarantine, never silence
        job.finished_at = new Date().toISOString()
      } else {
        job.state = 'queued' // linear backoff: 1x, 2x, 3x ... the base delay
        job.runAfter = Date.now() + job.backoffMs * job.attempts
      }
    } finally {
      this.busy = false
    }
  }

  async status(id: string): Promise<JobRecord | null> {
    return this.jobs.get(id) ?? null
  }
  async deadLetters(): Promise<JobRecord[]> {
    return [...this.jobs.values()].filter((j) => j.state === 'dead')
  }
  async purge(): Promise<number> {
    let n = 0
    for (const [id, j] of this.jobs) {
      if (j.state === 'succeeded' || j.state === 'dead') {
        this.jobs.delete(id)
        n++
      }
    }
    return n
  }
  async drain(): Promise<void> {
    while ([...this.jobs.values()].some((j) => j.state === 'queued' || j.state === 'running')) {
      await new Promise((r) => setTimeout(r, TICK_MS)) // ref'd on purpose: keeps the unref'd tick firing
    }
  }
  async close(): Promise<void> {
    clearInterval(this.interval)
  }
}

export const adapter: Adapter = {
  name: 'retry',
  maxGrade: 'elementary',
  capabilities: ['job-status', 'dead-letter', 'retries'],
  async open(_queue: string): Promise<JobQueue> {
    return new RetryQueue()
  },
}
