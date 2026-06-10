// adapters/durable.ts — GRADUATED grade
//
// The heaviest dependency-free approximation of a real queue (BullMQ/SQS/pg-boss): a
// file-backed queue. Every job transition is persisted via write-temp + atomic rename, so
// accepted work SURVIVES a process restart — that earns `durable-queue`. On open, jobs
// found mid-run are re-queued (crash recovery), and resumed jobs wait until their handler
// is registered again. A bounded worker pool runs up to CONCURRENCY jobs at once
// (`concurrency`), and failures retry with exponential backoff before dead-lettering
// (`retries`, `dead-letter`). Swapping this for a real broker later changes this file
// only — that is the port doing its job. Payload/result must be JSON-serializable.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, EnqueueOptions, JobHandler, JobQueue, JobRecord } from '../port.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data')
const CONCURRENCY = 4

// What goes to disk: the observable record plus retry/scheduling bookkeeping.
interface Stored extends JobRecord {
  maxAttempts: number
  backoffMs: number
  runAfter: number // epoch ms — do not start before this
}

class DurableQueue implements JobQueue {
  private handlers = new Map<string, JobHandler>()
  private jobs = new Map<string, Stored>()
  private running = 0
  private timer: NodeJS.Timeout | null = null // wake-up for the next scheduled/backoff run
  private closed = false
  private path: string

  private constructor(queue: string) {
    this.path = join(DATA_DIR, `jobs-${queue}.json`)
  }

  static async open(queue: string): Promise<DurableQueue> {
    const q = new DurableQueue(queue)
    try {
      const arr = JSON.parse(await readFile(q.path, 'utf8')) as Stored[]
      for (const j of arr) {
        // Crash recovery: a job persisted as 'running' never finished — re-queue it.
        if (j.state === 'running') {
          j.state = 'queued'
          j.runAfter = 0
        }
        q.jobs.set(j.id, j)
      }
    } catch {
      // first open: no file yet
    }
    return q
  }

  private async flush(): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true })
    const tmp = `${this.path}.${crypto.randomUUID()}.tmp`
    await writeFile(tmp, JSON.stringify([...this.jobs.values()], null, 2))
    await rename(tmp, this.path) // atomic on POSIX — the durability guarantee
  }

  register(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler)
    this.pump() // resumed jobs may have been waiting for exactly this handler
  }

  async enqueue(name: string, payload: unknown = null, opts: EnqueueOptions = {}): Promise<string> {
    if (!this.handlers.has(name)) throw new Error(`no handler registered for job '${name}'`)
    const rec: Stored = {
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
    await this.flush() // persisted BEFORE we return the id: an accepted enqueue is a promise
    this.pump()
    return rec.id
  }

  // pump: start due jobs while the pool has capacity, then set an (unref'd) wake-up timer
  // for the earliest future run. Called after enqueue, register, and every job completion.
  private pump(): void {
    if (this.closed) return
    const now = Date.now()
    const runnable = [...this.jobs.values()]
      .filter((j) => j.state === 'queued' && this.handlers.has(j.name))
      .sort((a, b) => a.runAfter - b.runAfter)
    while (this.running < CONCURRENCY && runnable.length > 0 && runnable[0].runAfter <= now) {
      void this.runJob(runnable.shift()!)
    }
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    const next = runnable[0]
    if (next) {
      this.timer = setTimeout(() => {
        this.timer = null
        this.pump()
      }, Math.max(1, next.runAfter - now))
      this.timer.unref() // never holds the process open by itself; drain()'s ref'd poll does
    }
  }

  private async runJob(job: Stored): Promise<void> {
    // State flips synchronously (before the first await) so a re-entrant pump cannot double-start.
    this.running++
    job.state = 'running'
    job.attempts++
    const handler = this.handlers.get(job.name)!
    await this.flush() // a crash from here re-queues the job on next open
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
        job.state = 'queued' // exponential backoff: 1x, 2x, 4x ... the base delay
        job.runAfter = Date.now() + job.backoffMs * 2 ** (job.attempts - 1)
      }
    }
    this.running--
    await this.flush()
    this.pump()
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
    if (n > 0) await this.flush()
    return n
  }
  async drain(): Promise<void> {
    // Queued jobs without a registered handler are waiting for a future process; they do
    // not block drain. Everything runnable must reach a terminal state.
    while ([...this.jobs.values()].some((j) => j.state === 'running' || (j.state === 'queued' && this.handlers.has(j.name)))) {
      await new Promise((r) => setTimeout(r, 5)) // ref'd on purpose: keeps the loop alive
    }
  }
  async close(): Promise<void> {
    this.closed = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    await this.flush() // whatever is mid-flight is persisted; next open recovers it
  }
}

export const adapter: Adapter = {
  name: 'durable',
  maxGrade: 'graduated',
  capabilities: ['job-status', 'dead-letter', 'retries', 'durable-queue', 'concurrency'],
  async open(queue: string): Promise<JobQueue> {
    return DurableQueue.open(queue)
  },
}
