// adapters/broker.ts — NURSERY grade
//
// In-process broker: one peer table, direct dispatch from sender straight into the
// recipient's inbox. The PORT guarantee already holds in full — register() mints a random
// handle and the address table never leaves this file — but there is no relay between the
// endpoints and a captured envelope re-injected later is happily delivered twice. Real
// enough to build and test against in the first five minutes; tops out at `nursery`.

import { randomBytes } from 'node:crypto'
import type { Adapter, Envelope, PrivateTransport, Receipt, Registration } from '../port.ts'
import { expose } from './_adversary.ts'

interface Peer {
  addr: string // internal transport address — exists ONLY so there is something to hide
  inbox: Envelope[]
  contacts: Set<string>
}

class BrokerNet implements PrivateTransport {
  private peers = new Map<string, Peer>()
  private carried = new Map<string, { to: string; env: Envelope }>() // what an adversary could capture
  private nextPort = 49152

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
  async send(from: string, to: string, payload: string): Promise<Receipt> {
    const sender = this.peers.get(from)
    const recipient = this.peers.get(to)
    if (!sender || !recipient) throw new Error('send: unknown handle')
    if (!sender.contacts.has(to)) throw new Error('send: peers were never introduced — rendezvous first')
    const env: Envelope = { from, payload, nonce: randomBytes(12).toString('hex') }
    recipient.inbox.push(env) // direct dispatch — the very thing the first gate retires
    const id = randomBytes(16).toString('hex')
    this.carried.set(id, { to, env })
    return { id, nonce: env.nonce }
  }
  async recv(handle: string): Promise<Envelope[]> {
    const p = this.peers.get(handle)
    if (!p) throw new Error('recv: unknown handle')
    return p.inbox.splice(0)
  }
  async close(): Promise<void> {
    this.peers.clear()
    this.carried.clear() // no timers, no sockets — nothing here can hold the process open
  }

  // adversary seam (see _adversary.ts) — never reachable through the port
  addressTable(): string[] {
    return [...this.peers.values()].map((p) => p.addr)
  }
  replayCarried(receiptId: string): boolean {
    const c = this.carried.get(receiptId)
    if (!c) throw new Error('replay: unknown receipt id')
    this.peers.get(c.to)?.inbox.push(c.env) // no nonce tracking — the replay is ACCEPTED
    return true
  }
}

export const adapter: Adapter = {
  name: 'broker',
  maxGrade: 'nursery',
  capabilities: ['opaque-handles', 'no-address-storage'], // no relay hop, no replay protection
  async connect(): Promise<PrivateTransport> {
    const net = new BrokerNet()
    expose(net, { addresses: () => net.addressTable(), replay: (id) => net.replayCarried(id) })
    return net
  },
}
