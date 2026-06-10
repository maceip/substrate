// adapters/buffered.ts — ELEMENTARY grade (the realtime DEFAULT)
//
// In-process fanout with the two guarantees the first gate activates: a per-topic ring
// buffer (last 256 events) so a reconnecting subscriber can pass { fromSeq } and replay
// what it missed, and a bounded per-subscriber queue with an explicit drop-oldest overflow
// policy so one slow consumer costs bounded memory, never the process. Still one process —
// a subscriber attached to another instance hears nothing, which is exactly what the
// elementary->graduated gate watches for. App code does not change one character moving
// here from the emitter.

import type { Adapter, PubSub, SubscribeOpts, Subscriber, Subscription, TopicEvent } from '../port.ts'
import { Broker } from './_core.ts'

class BufferedPubSub implements PubSub {
  private broker = new Broker()
  private closed = false

  async publish<T>(topic: string, data: T): Promise<TopicEvent<T>> {
    if (this.closed) throw new Error('pubsub closed')
    return this.broker.publish(topic, data)
  }
  async subscribe<T>(topic: string, cb: Subscriber<T>, opts: SubscribeOpts = {}): Promise<Subscription> {
    if (this.closed) throw new Error('pubsub closed')
    const handle = this.broker.attach(topic, cb as Subscriber, opts)
    return { unsubscribe: () => handle.detach(), stats: () => handle.stats() }
  }
  async topics(): Promise<string[]> {
    return this.broker.topics()
  }
  async subscriberCount(topic: string): Promise<number> {
    return this.broker.subscriberCount(topic)
  }
  async close(): Promise<void> {
    this.closed = true
    this.broker.detachAll()
  }
}

export const adapter: Adapter = {
  name: 'buffered',
  maxGrade: 'elementary',
  capabilities: ['per-topic-order', 'replay', 'bounded-queue'],
  async open(): Promise<PubSub> {
    return new BufferedPubSub()
  },
}
