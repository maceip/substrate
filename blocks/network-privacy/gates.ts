// gates.ts — THE GRADING / GATING MODEL for network-privacy. [PROTECTED]
//
// Ladder from the port catalog (`network-privacy-transport`, mined from real repos): single
// private-transport adapter that hides peer addressing -> mixnet/onion routing, cover
// traffic, replay-safe discovery, adversarial tests. The first gate fires when messages
// leave the lab (real users, or more than one pair of peers); the second when traffic
// crosses a network an adversary can observe, or volume makes traffic analysis a live threat.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface PrivacySignals {
  peers: number // registered peers exchanging messages
  prod: boolean // real users' messages ride this transport
  hostileNetwork: boolean // traffic crosses a network an observer can watch (public internet)
  messagesPerDay: number // approximate message volume
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: PrivacySignals
  capabilities: Set<string> // what the current adapter guarantees
  adapterGrade: Grade // current adapter's maxGrade
}

export interface Requirement {
  id: string
  describe: string
  satisfiedBy: (ctx: RequirementContext) => boolean
}

export interface Gate {
  id: string
  from: Grade
  to: Grade
  why: string
  triggered: (s: PrivacySignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const opaqueHandles = cap('opaque-handles', 'opaque-handles', 'peers are named by random handles minted at register() — a handle neither contains nor derives from a transport address')
const noAddressStorage = cap('no-address-storage', 'no-address-storage', 'no value the port returns carries a transport address, so app code CANNOT store one — the mistake that kills anonymity is unrepresentable')
const relayHop = cap('relay-hop', 'relay-hop', 'every message passes through at least one relay — sender and receiver never observe each other directly')
const replayProtection = cap('replay-protection', 'replay-protection', 'a captured envelope re-injected later is rejected by nonce, never delivered twice')
const multiHop = cap('multi-hop', 'multi-hop', 'messages traverse 2+ relays, so no single node sees both sender and receiver')
const sealedEnvelopes = cap('sealed-envelopes', 'sealed-envelopes', 'per-hop sealed envelopes — each relay can open only its own layer, never the payload or the full route')
const coverTrafficReady = cap('cover-traffic-ready', 'cover-traffic-ready', 'messages move through a batching mix queue padded with dummy traffic, so timing/count alone cannot link sender to receiver')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'more than one pair of peers, or real users — endpoints must never learn each other\'s location, and a captured message must not be replayable',
    triggered: (s) => s.peers > 2 || s.prod,
    activates: [opaqueHandles, noAddressStorage, relayHop, replayProtection],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'a hostile/public network or real volume — one relay sees both endpoints, and traffic analysis becomes the live threat',
    triggered: (s) => s.hostileNetwork || s.messagesPerDay > 10_000,
    activates: [multiHop, sealedEnvelopes, coverTrafficReady],
  },
]

// --- Evaluator -----------------------------------------------------------------------

export interface Unmet {
  gate: string
  requirement: string
  describe: string
}

export interface Evaluation {
  requiredGrade: Grade
  crossed: string[] // gate ids whose threshold is met
  unmet: Unmet[] // activated requirements not yet satisfied
  underGraded: boolean // current adapter cannot reach requiredGrade
  ok: boolean
}

export function evaluate(ctx: RequirementContext, gates: Gate[] = GATES): Evaluation {
  let requiredGrade: Grade = 'nursery'
  const crossed: string[] = []
  const unmet: Unmet[] = []

  for (const gate of gates) {
    if (!gate.triggered(ctx.signals)) continue
    crossed.push(gate.id)
    if (gradeAtLeast(gate.to, requiredGrade)) requiredGrade = gate.to
    for (const req of gate.activates) {
      if (!req.satisfiedBy(ctx)) unmet.push({ gate: gate.id, requirement: req.id, describe: req.describe })
    }
  }

  const underGraded = !gradeAtLeast(ctx.adapterGrade, requiredGrade)
  return { requiredGrade, crossed, unmet, underGraded, ok: unmet.length === 0 && !underGraded }
}

// AEvo protection (assertNoLoosening) is the shared spine primitive, re-exported at the top
// of this file from ../_kernel/grade.ts — written once, used by every block.
