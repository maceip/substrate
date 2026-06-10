// port.ts — THE PORT for async-jobs. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping the execution engine (inline in-process -> retrying worker -> durable
// file-backed queue; later BullMQ/SQS/pg-boss) must pass through here and change NOTHING
// above it. App code imports from ./index.ts, which re-exports this. App code NEVER
// imports an adapter directly.
//
// The contract is deliberately timing-blind: enqueue() returns a job ID (a handle), and
// the port guarantees the TERMINAL outcome behind that handle — when a job runs, and how
// many times it is attempted, is the adapter's business (that is the GRADE, not the port).
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add
// a guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

// Grade is the ladder every block shares (nursery < elementary < graduated). The app cannot
// tell which grade is behind the port — that is the whole point.
export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// The lifecycle every job moves through. 'queued' and 'running' are transient; 'succeeded'
// and 'dead' are terminal. A failed attempt that will be retried goes BACK to 'queued' —
// 'dead' always means "no further attempts will be made" (the dead-letter state).
export type JobState = 'queued' | 'running' | 'succeeded' | 'dead'

// JobRecord: the observable status of one job. `attempts` is diagnostic metadata (an
// adapter with retries will show more than 1); the invariant part is the terminal state,
// result, and error. Payload/result must be JSON-serializable (durable adapters persist them).
export interface JobRecord {
  id: string
  name: string
  state: JobState
  attempts: number
  payload: unknown
  result: unknown // set when state === 'succeeded', else null
  error: string | null // last failure message, if any attempt failed
  enqueued_at: string // ISO-8601
  finished_at: string | null // ISO-8601, set when the state becomes terminal
}

// JobHandler: the processor app code registers for a job name. Returning a value records
// it as the job's result; throwing marks the attempt failed.
export type JobHandler = (payload: unknown) => unknown | Promise<unknown>

export interface EnqueueOptions {
  maxAttempts?: number // default 3; adapters without the `retries` capability run exactly one attempt
  backoffMs?: number // base delay between retry attempts (default 25; growth is the adapter's policy)
  delayMs?: number // scheduling: run no earlier than now + delayMs (default 0)
}

// JobQueue: the contract. Every adapter, at every grade, satisfies exactly this.
export interface JobQueue {
  register(name: string, handler: JobHandler): void
  enqueue(name: string, payload?: unknown, opts?: EnqueueOptions): Promise<string> // -> job id
  status(id: string): Promise<JobRecord | null>
  deadLetters(): Promise<JobRecord[]> // failed work, represented explicitly — never silence
  purge(): Promise<number> // remove terminal jobs (succeeded + dead); returns how many
  drain(): Promise<void> // resolve once no job is queued or running (tests, shutdown)
  close(): Promise<void> // stop timers/workers so the process can exit
}

// Adapter: what each adapter file exports. The port is the SHAPE (JobQueue); the adapter is
// the swappable engine behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(queue: string): Promise<JobQueue>
}
