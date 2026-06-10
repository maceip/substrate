// adapters/emitter.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: an in-process map of topic -> subscriber set,
// fanned out at publish. Per-topic order holds (delivery happens in publish order), but
// there is NO replay — `fromSeq` is accepted and ignored, exactly like nursery transport
// ignores middleware — and NO bound on a slow consumer. The gate (gates.ts) is what catches
// that you kept this past more-than-one-subscriber or prod.

import type { Adapter, PubSub, SubscribeOpts, Subscriber, SubscriberStats, Subscription, TopicEvent } from '../port.ts'

interface Sub {
  cb: Subscriber
  delivered: number
}

class EmitterPubSub implements PubSub {
  private seqs = new Map<string, number>()
  private subs = new Map<string, Set<Sub>>()
  private closed = false

  async publish<T>(topic: string, data: T): Promise<TopicEvent<T>> {
    if (this.closed) throw new Error('pubsub closed')
    const seq = (this.seqs.get(topic) ?? 0) + 1
    this.seqs.set(topic, seq)
    const event: TopicEvent<T> = { topic, seq, ts: new Date().toISOString(), data }
    for (const sub of this.subs.get(topic) ?? []) {
      sub.delivered++
      void sub.cb(event) // fire-and-forget: no queue, no bound — the nursery trade-off
    }
    return event
  }

  async subscribe<T>(topic: string, cb: Subscriber<T>, _opts: SubscribeOpts = {}): Promise<Subscription> {
    if (this.closed) throw new Error('pubsub closed')
    const sub: Sub = { cb: cb as Subscriber, delivered: 0 }
    let set = this.subs.get(topic)
    if (!set) this.subs.set(topic, (set = new Set()))
    set.add(sub)
    return {
      unsubscribe: () => void set.delete(sub),
      stats: (): SubscriberStats => ({ delivered: sub.delivered, dropped: 0, queued: 0 }),
    }
  }

  async topics(): Promise<string[]> {
    return [...this.seqs.keys()].sort()
  }
  async subscriberCount(topic: string): Promise<number> {
    return this.subs.get(topic)?.size ?? 0
  }
  async close(): Promise<void> {
    this.closed = true
    this.subs.clear()
  }
}

export const adapter: Adapter = {
  name: 'emitter',
  maxGrade: 'nursery',
  capabilities: ['per-topic-order'], // no replay, no bounded-queue, no cross-instance
  async open(): Promise<PubSub> {
    return new EmitterPubSub()
  },
}
