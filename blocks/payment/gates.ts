// gates.ts — THE GRADING / GATING MODEL for payment. [PROTECTED]
//
// Ladder from the port catalog (`payment-billing-rail`, mined from real repos): single
// provider checkout/payment adapter -> subscriptions, ledger reconciliation, webhooks, tax,
// multi-currency. The first gate fires when real money moves or charges back the business in
// production — an in-memory ledger that dies with the process is no longer acceptable, and
// every charge must be idempotent, every amount integer cents, every move a durable ledger
// entry. The second fires when a real provider is in the loop (their webhooks, their settled
// truth) or multi-currency volume — now webhook signatures must be verified fail-closed and
// the in-house ledger must reconcile against the provider's record of truth.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface PaymentSignals {
  prod: boolean // charges run against real customers in production
  realMoney: boolean // settlements move actual money (not a sandbox / test mode)
  chargesPerDay: number // approximate daily charge volume
  multiCurrency: boolean // more than one settlement currency is in play
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: PaymentSignals
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
  triggered: (s: PaymentSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const idempotentCharge = cap('idempotent-charge', 'idempotent-charge', 'the same idempotencyKey replays the first charge and never settles twice — a retried request, a double-click or a webhook redelivery cannot double-charge')
const integerMinorUnits = cap('integer-minor-units', 'integer-minor-units', 'every amount is an integer number of minor units (cents); no money value is produced by float arithmetic, so cents cannot drift across a refund')
const doubleEntryLedger = cap('double-entry-ledger', 'double-entry-ledger', 'every charge and refund is a durable ledger entry and balance is the SUM of entries — there is no separately mutated total that can fall out of sync with the entries')
const webhookVerified = cap('webhook-verified', 'webhook-verified', 'inbound webhooks are signature-verified fail-closed (bad/absent signature -> rejected, never processed) — an unverified event has no path to being acted on')
const reconciliation = cap('reconciliation', 'reconciliation', 'the in-house ledger reconciles against the provider\'s record of truth — a charge the provider settled but we missed (or vice versa) is detectable, not silent')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'real money now moves in production — an in-memory ledger that dies with the process is unacceptable, and a double-charge or a drifted cent is a refund, a chargeback and a trust problem',
    triggered: (s) => s.prod || s.realMoney,
    activates: [idempotentCharge, integerMinorUnits, doubleEntryLedger],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'a real provider is in the loop (their webhooks, their settled truth) or multi-currency volume — webhook signatures must be verified fail-closed and the ledger must reconcile against the provider\'s record',
    triggered: (s) => (s.realMoney && s.chargesPerDay > 1_000) || s.multiCurrency,
    activates: [webhookVerified, reconciliation],
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
