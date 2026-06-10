// gates.ts — THE GRADING / GATING MODEL for attestation. [PROTECTED]
//
// Ladder from the port catalog (`attestation-crypto-boundary`, mined from real repos): local
// verifier/signer adapter with explicit claim type -> TEE/remote attestation, key rotation,
// proof aggregation, policy verification. The first gate fires when proofs start to matter
// outside this process (production decisions, or verifiers you do not run); the second when
// proof volume or key age says one ephemeral key per process can no longer hold the line.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface AttestationSignals {
  prod: boolean // proofs back decisions in production
  externalVerifiers: boolean // proofs leave the process/org — someone you do not run verifies them
  proofsPerDay: number // approximate signing volume
  keyAgeDays: number // age of the oldest active signing key
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: AttestationSignals
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
  triggered: (s: AttestationSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const asymmetricKeys = cap('asymmetric-keys', 'asymmetric-keys', 'verifiers hold only the public key — a verifier that needs the signing secret IS a signer, and every place the secret travels is a place it leaks')
const keyPersisted = cap('key-persisted', 'key-persisted', 'the signing key survives a restart, so every proof issued before the restart still verifies after it')
const expiryEnforced = cap('expiry-enforced', 'expiry-enforced', 'a claim past its expiresAt verifies false — "no expiry" is never silently promoted to "valid forever"')
const rotationSupported = cap('rotation-supported', 'rotation-supported', 'the signing key can rotate with overlapping validity — old public keys keep verifying old proofs while new proofs use the new key')
const proofAggregation = cap('proof-aggregation', 'proof-aggregation', 'a batch of proofs verifies in one call with one verdict — volume does not turn verification into the bottleneck')
const policyChecked = cap('policy-checked', 'policy-checked', 'verification enforces a policy beyond the signature (required expiry, max claim age) — "cryptographically genuine" is not confused with "acceptable"')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'proofs now back production decisions or leave the process — a shared symmetric secret and an ephemeral key orphan every proof and turn every verifier into a signer',
    triggered: (s) => s.prod || s.externalVerifiers,
    activates: [asymmetricKeys, keyPersisted, expiryEnforced],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'real proof volume or a long-lived key — one key forever is a standing target, and one-at-a-time verification with no acceptance policy cannot hold the line',
    triggered: (s) => s.proofsPerDay > 10_000 || s.keyAgeDays > 90,
    activates: [rotationSupported, proofAggregation, policyChecked],
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
