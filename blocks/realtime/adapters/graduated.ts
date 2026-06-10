// adapters/graduated.ts — GRADUATED grade
//
// The heaviest dependency-free approximation of a real broker: the SAME broker core as the
// elementary grade, pushed behind node:http on loopback. Publishes POST to it; subscribers
// hold an SSE stream and resume with standard Last-Event-ID semantics (the wire form of
// fromSeq). Because the broker is reached over HTTP/SSE, any process that can reach the
// port can attach — that is what earns `cross-instance`. It STANDS IN for a real broker
// (Redis pub/sub, NATS, a managed SSE/websocket service): when one arrives, only this file
// changes.
//
// Everything opened here is closed by close(): the server and every live stream. Nothing
// may keep the process alive after the app lets go.

import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { Adapter, PubSub, SubscribeOpts, Subscriber, SubscriberStats, Subscription, TopicEvent } from '../port.ts'
import { Broker } from './_core.ts'

// The broker side: routes are /topics, /topics/:t (POST publish), /topics/:t/subscribers,
// /topics/:t/stream (SSE). The SSE writer sits behind the core's bounded queue, so a slow
// socket hits the same drop-oldest policy as any other consumer.
function startBroker(broker: Broker): Promise<{ server: Server; base: string }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const parts = url.pathname.split('/').filter(Boolean)
    const topic = parts[0] === 'topics' && parts[1] ? decodeURIComponent(parts[1]) : undefined

    if (req.method === 'GET' && parts.length === 1 && parts[0] === 'topics') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return void res.end(JSON.stringify(broker.topics()))
    }
    if (req.method === 'GET' && topic && parts[2] === 'subscribers') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return void res.end(JSON.stringify({ count: broker.subscriberCount(topic) }))
    }
    if (req.method === 'GET' && topic && parts[2] === 'stream') {
      // Last-Event-ID is the id of the last event the client SAW; replay resumes one past it.
      const lastId = req.headers['last-event-id']
      const fromSeq = typeof lastId === 'string' && lastId !== '' ? Number(lastId) + 1 : undefined
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' })
      res.write(': connected\n\n') // SSE comment frame — flushes headers so subscribe() resolves before any event
      const handle = broker.attach(topic, (e) => void res.write(`id: ${e.seq}\ndata: ${JSON.stringify(e)}\n\n`), { fromSeq })
      res.on('close', () => handle.detach())
      return
    }
    if (req.method === 'POST' && topic && parts.length === 2) {
      const chunks: Buffer[] = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        try {
          const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')
          const event = broker.publish(topic, data)
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(event))
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: 'body must be JSON' }))
        }
      })
      return
    }
    res.writeHead(404)
    res.end()
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, base: `http://127.0.0.1:${port}` })
    })
  })
}

// The client side the app actually holds: every port method crosses the wire, exactly as
// it would against a remote broker.
class SsePubSub implements PubSub {
  private server: Server
  private base: string
  private broker: Broker
  private streams = new Set<AbortController>()
  private closed = false

  constructor(server: Server, base: string, broker: Broker) {
    this.server = server
    this.base = base
    this.broker = broker
  }

  async publish<T>(topic: string, data: T): Promise<TopicEvent<T>> {
    if (this.closed) throw new Error('pubsub closed')
    const res = await fetch(`${this.base}/topics/${encodeURIComponent(topic)}`, { method: 'POST', body: JSON.stringify(data ?? null) })
    return (await res.json()) as TopicEvent<T>
  }

  async subscribe<T>(topic: string, cb: Subscriber<T>, opts: SubscribeOpts = {}): Promise<Subscription> {
    if (this.closed) throw new Error('pubsub closed')
    const ctrl = new AbortController()
    this.streams.add(ctrl)
    const headers: Record<string, string> = { accept: 'text/event-stream' }
    if (opts.fromSeq !== undefined) headers['last-event-id'] = String(opts.fromSeq - 1)
    const res = await fetch(`${this.base}/topics/${encodeURIComponent(topic)}/stream`, { headers, signal: ctrl.signal })
    const stats: SubscriberStats = { delivered: 0, dropped: 0, queued: 0 }
    void this.pump(res, cb as Subscriber, stats, ctrl)
    return {
      unsubscribe: () => {
        ctrl.abort()
        this.streams.delete(ctrl)
      },
      stats: () => ({ ...stats }),
    }
  }

  // Read the SSE stream frame by frame. The consumer is awaited per event, so a slow
  // consumer slows its own socket reads (TCP backpressure); the broker side stays bounded
  // by the core's drop-oldest queue policy.
  private async pump(res: Response, cb: Subscriber, stats: SubscriberStats, ctrl: AbortController): Promise<void> {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let end: number
        while ((end = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, end)
          buf = buf.slice(end + 2)
          const dataLine = frame.split('\n').find((l) => l.startsWith('data: '))
          if (!dataLine) continue
          const event = JSON.parse(dataLine.slice(6)) as TopicEvent
          try {
            await cb(event)
          } catch {
            // consumer errors do not kill the stream
          }
          stats.delivered++
        }
      }
    } catch {
      // stream aborted by unsubscribe()/close()
    } finally {
      this.streams.delete(ctrl)
    }
  }

  async topics(): Promise<string[]> {
    if (this.closed) throw new Error('pubsub closed')
    return (await (await fetch(`${this.base}/topics`)).json()) as string[]
  }
  async subscriberCount(topic: string): Promise<number> {
    if (this.closed) throw new Error('pubsub closed')
    const body = (await (await fetch(`${this.base}/topics/${encodeURIComponent(topic)}/subscribers`)).json()) as { count: number }
    return body.count
  }
  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    for (const ctrl of this.streams) ctrl.abort()
    this.streams.clear()
    this.broker.detachAll()
    this.server.closeAllConnections()
    await new Promise<void>((resolve) => this.server.close(() => resolve()))
  }
}

export const adapter: Adapter = {
  name: 'graduated',
  maxGrade: 'graduated',
  capabilities: ['per-topic-order', 'replay', 'bounded-queue', 'cross-instance', 'last-event-id'],
  async open(): Promise<PubSub> {
    const broker = new Broker()
    const { server, base } = await startBroker(broker)
    return new SsePubSub(server, base, broker)
  },
}
