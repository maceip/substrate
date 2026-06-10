// adapters/relay.ts — ELEMENTARY grade (the default)
//
// Single-relay hop. A sender hands its envelope to THE RELAY; the relay alone holds the
// handle -> address routing table and forwards into the recipient's inbox — neither
// endpoint ever holds (or could observe) the other's location, which earns `relay-hop`.
// Every envelope carries a fresh nonce and the relay refuses one it has seen
// (`replay-protection`), so a captured message cannot be re-injected. Still ONE relay that
// sees both endpoints, so it tops out at `elementary` — on a hostile network the graduated
// mix chain takes over. App code does not change one character moving here from the broker.

import { randomBytes } from 'node:crypto'
import type { Adapter, Envelope, PrivateTransport, Receipt, Registration } from '../port.ts'
import { expose } from './_adversary.ts'

interface Peer {
  addr: string // known ONLY to the relay's routing table — never to the other endpoint
  inbox: Envelope[]
  contacts: Set<string>
}

class RelayNet implements PrivateTransport {
  private peers = new Map<string, Peer>()
  private relayAddr: string
  private seen = new Set<string>() // nonces the relay has already carried
  private carried = new Map<string, { to: string; env: Envelope }>()
  private nextPort = 49152

  constructor() {
    this.relayAddr = `tcp://127.0.0.1:${this.nextPort++}/${randomBytes(4).toString('hex')}`
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
  // The relay's acceptance check — send() and an adversary's replay() both pass through it,
  // so replay protection is one code path, not a special case in the test.
  private accept(to: string, env: Envelope): boolean {
    if (this.seen.has(env.nonce)) return false
    this.seen.add(env.nonce)
    this.peers.get(to)?.inbox.push(env) // the one hop: relay table -> recipient inbox
    return true
  }
  async send(from: string, to: string, payload: string): Promise<Receipt> {
    const sender = this.peers.get(from)
    const recipient = this.peers.get(to)
    if (!sender || !recipient) throw new Error('send: unknown handle')
    if (!sender.contacts.has(to)) throw new Error('send: peers were never introduced — rendezvous first')
    const env: Envelope = { from, payload, nonce: randomBytes(12).toString('hex') }
    this.accept(to, env) // fresh nonce — always accepted
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
    this.seen.clear()
    this.carried.clear() // no timers, no sockets — nothing here can hold the process open
  }

  // adversary seam (see _adversary.ts) — never reachable through the port
  addressTable(): string[] {
    return [this.relayAddr, ...[...this.peers.values()].map((p) => p.addr)]
  }
  replayCarried(receiptId: string): boolean {
    const c = this.carried.get(receiptId)
    if (!c) throw new Error('replay: unknown receipt id')
    return this.accept(c.to, c.env) // seen nonce — the relay refuses it
  }
}

export const adapter: Adapter = {
  name: 'relay',
  maxGrade: 'elementary',
  capabilities: ['opaque-handles', 'no-address-storage', 'relay-hop', 'replay-protection'],
  async connect(): Promise<PrivateTransport> {
    const net = new RelayNet()
    expose(net, { addresses: () => net.addressTable(), replay: (id) => net.replayCarried(id) })
    return net
  },
}
