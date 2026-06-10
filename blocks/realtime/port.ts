// port.ts — THE PORT for the realtime block. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping the fanout engine (in-process emitter -> buffered -> broker) must pass
// through here and change NOTHING above it. App code imports from ./index.ts, which
// re-exports this. App code NEVER imports an adapter directly.
//
// The reconnect seam is the per-topic monotonic `seq`: a consumer that remembers the last
// seq it saw can resubscribe with { fromSeq } and an adapter with replay hands back what it
// missed, in order. Whether that replay comes from a ring buffer or a broker's log is the
// adapter's business — app code only ever speaks seq.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

// Grade is the ladder every block shares (nursery < elementary < graduated). The app cannot
// tell which grade is behind the port — that is the whole point.
export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// TopicEvent: what every subscriber receives. `seq` is monotonic PER TOPIC, starts at 1,
// never repeats and never renumbers — it is the replay/reconnect seam.
export interface TopicEvent<T = unknown> {
  topic: string
  seq: number
  ts: string // ISO-8601, stamped at publish
  data: T
}

// A subscriber may be async; adapters with backpressure await it, so a slow consumer backs
// up its OWN queue only — it never blocks the publisher or other subscribers.
export type Subscriber<T = unknown> = (event: TopicEvent<T>) => void | Promise<void>

export interface SubscribeOpts {
  fromSeq?: number // replay retained events with seq >= fromSeq before going live
  maxQueue?: number // bound on this subscriber's pending-delivery queue (adapter default applies)
}

// Consumer-side delivery counters. `dropped` > 0 means the overflow policy fired: by
// contract events are DROPPED (oldest first), never buffered without bound.
export interface SubscriberStats {
  delivered: number
  dropped: number
  queued: number
}

export interface Subscription {
  unsubscribe(): void
  stats(): SubscriberStats
}

// PubSub: the contract. Every adapter, at every grade, satisfies exactly this.
//   - publish resolves to the stamped event (the caller learns its seq)
//   - per-topic delivery order matches publish order
//   - after close(), publish/subscribe reject and NOTHING keeps the process alive
export interface PubSub {
  publish<T>(topic: string, data: T): Promise<TopicEvent<T>>
  subscribe<T>(topic: string, cb: Subscriber<T>, opts?: SubscribeOpts): Promise<Subscription>
  topics(): Promise<string[]> // topics that have seen at least one publish, sorted
  subscriberCount(topic: string): Promise<number>
  close(): Promise<void>
}

// Adapter: what each adapter file exports. The port is the SHAPE (PubSub); the adapter is
// the swappable thing behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(): Promise<PubSub>
}
