// adapters/inline.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: jobs run in-process the moment they are
// enqueued (delayMs honored via a timer), with explicit per-job status — the catalog's
// "local worker with explicit job status". There are NO retries: the first failure is
// terminal and the job goes straight to the dead-letter list (failures are represented
// explicitly, but transient failure is treated as permanent — which is exactly what the
// nursery->elementary gate flags). Real enough for tests and the first five minutes.

import type { Adapter, EnqueueOptions, JobHandler, JobQueue, JobRecord } from '../port.ts'

class InlineQueue implements JobQueue {
  private handlers = new Map<string, JobHandler>()
  private jobs = new Map<string, JobRecord>()
  private pending = new Set<Promise<void>>()
  private wakers = new Set<() => void>() // cancellable delay timers, so close() never hangs
  private closed = false

  register(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler)
  }

  async enqueue(name: string, payload: unknown = null, opts: EnqueueOptions = {}): Promise<string> {
    const handler = this.handlers.get(name)
    if (!handler) throw new Error(`no handler registered for job '${name}'`)
    const rec: JobRecord = {
      id: crypto.randomUUID(),
      name,
      state: 'queued',
      attempts: 0,
      payload,
      result: null,
      error: null,
      enqueued_at: new Date().toISOString(),
      finished_at: null,
    }
    this.jobs.set(rec.id, rec)
    const p = this.run(rec, handler, opts.delayMs ?? 0)
    this.pending.add(p)
    void p.finally(() => this.pending.delete(p))
    return rec.id
  }

  // One attempt, immediately (or after delayMs). Failure is terminal — that is the nursery.
  private async run(rec: JobRecord, handler: JobHandler, delayMs: number): Promise<void> {
    if (delayMs > 0) await this.sleep(delayMs)
    if (this.closed) return // close() cancels scheduled work; the record stays 'queued'
    rec.state = 'running'
    rec.attempts = 1
    try {
      rec.result = (await handler(rec.payload)) ?? null
      rec.state = 'succeeded'
    } catch (e) {
      rec.error = e instanceof Error ? e.message : String(e)
      rec.state = 'dead' // no retries at nursery: first failure dead-letters
    }
    rec.finished_at = new Date().toISOString()
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        this.wakers.delete(wake)
        resolve()
      }, ms)
      const wake = () => {
        clearTimeout(t)
        resolve()
      }
      this.wakers.add(wake)
    })
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
    while (this.pending.size > 0) await Promise.all([...this.pending])
  }
  async close(): Promise<void> {
    this.closed = true
    for (const wake of this.wakers) wake() // release any delayed runs so nothing holds the loop
    this.wakers.clear()
  }
}

export const adapter: Adapter = {
  name: 'inline',
  maxGrade: 'nursery',
  capabilities: ['job-status', 'dead-letter'], // explicit status + explicit failures; no retries, nothing durable
  async open(_queue: string): Promise<JobQueue> {
    return new InlineQueue()
  },
}
