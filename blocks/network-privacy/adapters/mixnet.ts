// adapters/mixnet.ts — GRADUATED grade
//
// The heaviest dependency-free approximation of mix routing. Two relay hops — entry and
// exit — each with its own AES-256-GCM key; send() seals the envelope per hop (onion
// layers via node:crypto): the entry hop opens its layer and learns only "pass this blob to
// exit"; the exit hop opens its layer and learns only the destination handle. No single
// node sees both endpoints (`multi-hop`), and no relay can read the payload or the full
// route (`sealed-envelopes`). Envelopes move through a batching mix queue: each flush pads
// the batch with a dummy envelope and shuffles it, so order/count alone cannot link sender
// to receiver (`cover-traffic-ready`). The queue is pump-driven — flushed on recv — not
// timer-driven, so nothing here can hold the process open. Replay nonces are checked at the
// entry hop, exactly as at elementary. A real mixnet (Nym/Tor-style) replaces this file;
// app code does not change one character.

import { createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto'
import type { Adapter, Envelope, PrivateTransport, Receipt, Registration } from '../port.ts'
import { expose } from './_adversary.ts'

interface Peer {
  addr: string // known ONLY to the exit hop's routing table
  inbox: Envelope[]
  contacts: Set<string>
}

interface Hop {
  key: Buffer
  addr: string
}

// Per-hop sealing: iv | gcm-tag | ciphertext, base64. Each hop can open exactly one layer.
function sealFor(hop: Hop, plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', hop.key, iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')
}
function openAt(hop: Hop, blob: string): string {
  const raw = Buffer.from(blob, 'base64')
  const d = createDecipheriv('aes-256-gcm', hop.key, raw.subarray(0, 12))
  d.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')
}

class MixNet implements PrivateTransport {
  private peers = new Map<string, Peer>()
  private entry: Hop
  private exit: Hop
  private seen = new Set<string>() // nonces the entry hop has already accepted
  private queue: string[] = [] // sealed onions waiting for the next mix flush
  private carried = new Map<string, { onion: string; nonce: string }>()
  private nextPort = 49152

  constructor() {
    this.entry = { key: randomBytes(32), addr: `tcp://127.0.0.1:${this.nextPort++}/${randomBytes(4).toString('hex')}` }
    this.exit = { key: randomBytes(32), addr: `tcp://127.0.0.1:${this.nextPort++}/${randomBytes(4).toString('hex')}` }
  }

  async register(): Promise<Registration> {
    const handle = randomBytes(16).toString('hex') // minted, never derived — the guarantee
    const addr = `tcp://127.0.0.1:${this.nextPort++}/${randomBytes(4).toString('hex')}`
    this.peers.set(handle, { addr, inbox: [], contacts: new Set() })
    return { handle }
  }
  async introduce(a: string, b: string): Promise<void> {
    const pa = this.peers.get(a)
    const pb = this.peers.get(b)
    if (!pa || !pb) throw new Error('introduce: unknown handle')
    pa.contacts.add(b)
    pb.contacts.add(a)
  }
  // Entry-hop acceptance — send() and an adversary's replay() both pass through it.
  private acceptAtEntry(onion: string, nonce: string): boolean {
    if (this.seen.has(nonce)) return false
    this.seen.add(nonce)
    this.queue.push(onion)
    return true
  }
  async send(from: string, to: string, payload: string): Promise<Receipt> {
    const sender = this.peers.get(from)
    const recipient = this.peers.get(to)
    if (!sender || !recipient) throw new Error('send: unknown handle')
    if (!sender.contacts.has(to)) throw new Error('send: peers were never introduced — rendezvous first')
    const env: Envelope = { from, payload, nonce: randomBytes(12).toString('hex') }
    const inner = sealFor(this.exit, JSON.stringify({ to, env })) // exit learns the destination only
    const onion = sealFor(this.entry, JSON.stringify({ next: 'exit', blob: inner })) // entry learns the next hop only
    this.acceptAtEntry(onion, env.nonce) // fresh nonce — always accepted
    const id = randomBytes(16).toString('hex')
    this.carried.set(id, { onion, nonce: env.nonce })
    return { id, nonce: env.nonce }
  }
  // The mix flush: pad the batch with one dummy onion, shuffle, then walk each onion
  // through entry -> exit. Dummies are dropped at the exit hop (to === null).
  private flush(): void {
    if (this.queue.length === 0) return
    const dummyInner = sealFor(this.exit, JSON.stringify({ to: null, env: { from: 'dummy', payload: randomBytes(8).toString('hex'), nonce: randomBytes(12).toString('hex') } }))
    const batch = [...this.queue.splice(0), sealFor(this.entry, JSON.stringify({ next: 'exit', blob: dummyInner }))]
    for (let i = batch.length - 1; i > 0; i--) {
      const j = randomInt(i + 1)
      ;[batch[i], batch[j]] = [batch[j], batch[i]]
    }
    for (const onion of batch) {
      const { blob } = JSON.parse(openAt(this.entry, onion)) as { blob: string }
      const { to, env } = JSON.parse(openAt(this.exit, blob)) as { to: string | null; env: Envelope }
      if (to === null) continue // cover traffic dies at the exit
      this.peers.get(to)?.inbox.push(env)
    }
  }
  async recv(handle: string): Promise<Envelope[]> {
    const p = this.peers.get(handle)
    if (!p) throw new Error('recv: unknown handle')
    this.flush() // pump-driven mix — a real mixnet flushes on a (timer-driven) cadence
    return p.inbox.splice(0)
  }
  async close(): Promise<void> {
    this.peers.clear()
    this.seen.clear()
    this.queue.length = 0
    this.carried.clear() // no timers, no sockets — nothing here can hold the process open
  }

  // adversary seam (see _adversary.ts) — never reachable through the port
  addressTable(): string[] {
    return [this.entry.addr, this.exit.addr, ...[...this.peers.values()].map((p) => p.addr)]
  }
  replayCarried(receiptId: string): boolean {
    const c = this.carried.get(receiptId)
    if (!c) throw new Error('replay: unknown receipt id')
    return this.acceptAtEntry(c.onion, c.nonce) // seen nonce — the entry hop refuses it
  }
}

export const adapter: Adapter = {
  name: 'mixnet',
  maxGrade: 'graduated',
  capabilities: ['opaque-handles', 'no-address-storage', 'relay-hop', 'replay-protection', 'multi-hop', 'sealed-envelopes', 'cover-traffic-ready'],
  async connect(): Promise<PrivateTransport> {
    const net = new MixNet()
    expose(net, { addresses: () => net.addressTable(), replay: (id) => net.replayCarried(id) })
    return net
  },
}
