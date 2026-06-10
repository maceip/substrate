// gates.ts — THE GRADING / GATING MODEL for the realtime block. [PROTECTED]
//
//   GRADE — which adapter sits behind the port (nursery < elementary < graduated).
//   GATE  — an executable threshold over OBSERVABLE project signals. When it flips true,
//           the block must be at >= a higher grade, AND new REQUIREMENTS activate.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface RealtimeSignals {
  subscribers: number // peak concurrent subscribers across all topics
  eventsPerDay: number // approximate publish volume
  prod: boolean // live events feed real users in production
  instances: number // app processes/replicas running concurrently
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: RealtimeSignals
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
  triggered: (s: RealtimeSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const orderedDelivery: Requirement = {
  id: 'ordered-delivery',
  describe: 'per-topic delivery order matches publish order — consumers may assume it',
  satisfiedBy: (c) => c.capabilities.has('per-topic-order'),
}

const replayBuffer: Requirement = {
  id: 'replay-buffer',
  describe: 'a reconnecting subscriber can pass fromSeq and replay the events it missed, in order',
  satisfiedBy: (c) => c.capabilities.has('replay'),
}

const backpressure: Requirement = {
  id: 'backpressure',
  describe: 'a slow consumer hits a bounded queue with a stated drop/disconnect policy — never unbounded memory',
  satisfiedBy: (c) => c.capabilities.has('bounded-queue'),
}

const crossInstanceFanout: Requirement = {
  id: 'cross-instance-fanout',
  describe: 'an event published on one instance reaches subscribers attached to another',
  satisfiedBy: (c) => c.capabilities.has('cross-instance'),
}

const wireReconnect: Requirement = {
  id: 'wire-reconnect',
  describe: 'reconnection over a real wire resumes via standard Last-Event-ID semantics, not a custom handshake',
  satisfiedBy: (c) => c.capabilities.has('last-event-id'),
}

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'more than one live subscriber, or real users watching — a missed event after a reconnect is now a bug, and a slow consumer must not sink the process',
    triggered: (s) => s.subscribers > 1 || s.prod,
    activates: [orderedDelivery, replayBuffer, backpressure],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'multiple instances or real event volume — in-process fanout cannot reach a subscriber connected to another process',
    triggered: (s) => s.instances > 1 || s.eventsPerDay > 100_000,
    activates: [crossInstanceFanout, wireReconnect],
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
