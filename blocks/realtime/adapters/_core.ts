// adapters/_core.ts — the shared broker core behind the elementary and graduated adapters.
// Per-topic monotonic seq + ring-buffer replay + bounded per-subscriber queues with an
// explicit drop-oldest overflow policy. The buffered adapter exposes this core in-process;
// the graduated adapter puts node:http + SSE between the app and this exact same core —
// the one behavioral spine, two distances from the app.

import type { SubscribeOpts, Subscriber, SubscriberStats, TopicEvent } from '../port.ts'

export const RING_CAPACITY = 256 // replay window: the last N events retained per topic
export const DEFAULT_MAX_QUEUE = 64 // per-subscriber pending-delivery bound

interface Ring {
  seq: number
  events: TopicEvent[]
}

// A subscriber's bounded delivery queue. Events drain one at a time (an async consumer is
// awaited, so a slow consumer backs up its OWN queue only). On overflow the OLDEST queued
// event is dropped and counted — the stated policy: bounded memory, never an unbounded pile.
class QueueSub {
  cb: Subscriber
  maxQueue: number
  queue: TopicEvent[] = []
  delivered = 0
  dropped = 0
  private draining = false
  private detached = false

  constructor(cb: Subscriber, maxQueue: number) {
    this.cb = cb
    this.maxQueue = maxQueue
  }

  enqueue(event: TopicEvent): void {
    if (this.detached) return
    if (this.queue.length >= this.maxQueue) {
      this.queue.shift() // drop-oldest: the overflow policy, explicit and observable
      this.dropped++
    }
    this.queue.push(event)
    this.drain()
  }

  private drain(): void {
    if (this.draining) return
    this.draining = true
    queueMicrotask(async () => {
      while (this.queue.length > 0 && !this.detached) {
        const event = this.queue.shift()!
        try {
          await this.cb(event)
        } catch {
          // a throwing consumer does not stop the drain or poison other subscribers
        }
        this.delivered++
      }
      this.draining = false
    })
  }

  detach(): void {
    this.detached = true
    this.queue.length = 0
  }

  stats(): SubscriberStats {
    return { delivered: this.delivered, dropped: this.dropped, queued: this.queue.length }
  }
}

export interface AttachHandle {
  detach(): void
  stats(): SubscriberStats
}

export class Broker {
  private rings = new Map<string, Ring>()
  private subs = new Map<string, Set<QueueSub>>()

  publish<T>(topic: string, data: T): TopicEvent<T> {
    let ring = this.rings.get(topic)
    if (!ring) this.rings.set(topic, (ring = { seq: 0, events: [] }))
    ring.seq++
    const event: TopicEvent<T> = { topic, seq: ring.seq, ts: new Date().toISOString(), data }
    ring.events.push(event)
    if (ring.events.length > RING_CAPACITY) ring.events.shift()
    for (const sub of this.subs.get(topic) ?? []) sub.enqueue(event)
    return event
  }

  attach(topic: string, cb: Subscriber, opts: SubscribeOpts = {}): AttachHandle {
    const sub = new QueueSub(cb, opts.maxQueue ?? DEFAULT_MAX_QUEUE)
    let set = this.subs.get(topic)
    if (!set) this.subs.set(topic, (set = new Set()))
    set.add(sub)
    if (opts.fromSeq !== undefined) {
      // replay what the ring still holds (>= fromSeq), in order; live events queue behind it
      const ring = this.rings.get(topic)
      for (const event of ring?.events ?? []) if (event.seq >= opts.fromSeq) sub.enqueue(event)
    }
    return {
      detach: () => {
        sub.detach()
        set.delete(sub)
      },
      stats: () => sub.stats(),
    }
  }

  topics(): string[] {
    return [...this.rings.keys()].sort()
  }
  subscriberCount(topic: string): number {
    return this.subs.get(topic)?.size ?? 0
  }
  detachAll(): void {
    for (const set of this.subs.values()) for (const sub of set) sub.detach()
    this.subs.clear()
  }
}
