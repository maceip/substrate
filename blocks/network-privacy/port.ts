// port.ts — THE PORT for network-privacy. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping the privacy engine (in-process broker -> single relay hop -> mix chain)
// must pass through here and change NOTHING above it. The catalog ladder this block
// implements (port-catalog-v0, `network-privacy-transport`): single private-transport
// adapter that hides peer addressing -> mixnet/onion routing, cover traffic, replay-safe
// discovery, adversarial tests.
//
// THE PORT GUARANTEE (the reason this block exists): nothing returned by this port ever
// contains or derives from a transport address. A handle is a random id minted at
// register() — 128 bits from a CSPRNG, never an encoding, hash, or truncation of where the
// peer lives — so it is non-reversible by construction. App code that builds only on port
// values CANNOT store a peer address, because it never receives one: the failure mode that
// kills anonymity is unrepresentable above this line, not merely discouraged. (A real
// project died the other way — "users can't dial each other directly" lived in prose, an
// agent stored a peer address, and the anonymity property silently rotted for days. The
// guarantee now lives HERE, and block.test.ts plays the adversary to prove nothing the
// port returned reveals the engine's address table.)
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// The executable half of "opaque": every handle at every grade matches this shape — 32
// lowercase hex chars of CSPRNG output, nothing else. Tests and apps may assert against it.
export const HANDLE_SHAPE = /^[0-9a-f]{32}$/

// Registration: what register() returns. The handle is the peer's ONLY name above the port.
export interface Registration {
  handle: string
}

// Receipt: what send() returns. `id` is a fresh random id; `nonce` is the replay token this
// send carried (adapters with 'replay-protection' refuse a nonce they have seen). Neither
// field names, contains, or derives from a location.
export interface Receipt {
  id: string
  nonce: string
}

// Envelope: what recv() drains. `from` is the SENDER's opaque handle — a reply goes to a
// handle, never to an address, so a whole conversation never needs (and never gets) one.
export interface Envelope {
  from: string
  payload: string
  nonce: string
}

// PrivateTransport: the contract. Every adapter, at every grade, satisfies exactly this.
// One instance IS one private network (the in-process approximation); every party holds the
// same instance and is distinguished only by handle. Discovery is explicit: send() to a
// peer you were never introduce()d to is refused — rendezvous hands each side the OTHER'S
// HANDLE and nothing else; no third value (no address) ever crosses the port. Arrival order
// is NOT part of the contract: mix batching may reorder, so correlate by payload/nonce,
// never by position (ordering is a timing side channel, and the port refuses to promise it).
export interface PrivateTransport {
  register(): Promise<Registration>
  introduce(a: string, b: string): Promise<void>
  send(from: string, to: string, payload: string): Promise<Receipt>
  recv(handle: string): Promise<Envelope[]> // drain this handle's inbox
  close(): Promise<void>
}

// Adapter: what each adapter file exports. The port is the SHAPE (PrivateTransport); the
// adapter is the swappable thing behind it. `maxGrade` is the highest grade whose
// requirements this adapter can satisfy; `capabilities` are the named guarantees the gate
// evaluator checks against.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  connect(): Promise<PrivateTransport>
}
