// gates.ts — THE GRADING / GATING MODEL for remote-exec. [PROTECTED]
//
// The ladder this block implements: a LOCAL executor (run on localhost, copy via fs) ->
// a single declared SSH host (ssh/scp argv behind the port) -> a host INVENTORY with
// parallel fan-out + idempotent copy. The first gate fires when the work leaves localhost
// (a real remote host, or a command that mutates production) — surfacing exit codes and
// keeping key material off the wire-out stop being optional. The second fires when more
// than one host must answer the same command (a fleet) — an inventory, parallel fan-out,
// and copies that skip when the remote already matches (idempotent) become mandatory.
//
// Vocabulary settled in persistence/gates.ts and shared verbatim here:
//   GRADE  — which adapter sits behind the port (nursery < elementary < graduated).
//   GATE   — an executable threshold over OBSERVABLE project signals. When it flips true,
//            the block must be at >= a higher grade, AND new REQUIREMENTS activate.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface RemoteSignals {
  hosts: number // distinct hosts this command must reach
  prod: boolean // the host(s) run production workloads — a bad command has real blast radius
  mutatesRemote: boolean // the command/copy changes remote state (deploys, writes, restarts)
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: RemoteSignals
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
  triggered: (s: RemoteSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const exitCodeSurfaced = cap('exit-code-surfaced', 'exit-code-surfaced', 'a nonzero remote exit returns {code} instead of throwing — callers branch on the code deterministically, so a failed deploy step is handled, not swallowed by an exception path')
const noSecretLeak = cap('no-secret-leak', 'no-secret-leak', 'key material / identity-file contents never become command arguments and never appear in returned stdout/stderr — a key path is configured out-of-band, the bytes never cross the port')
const hostInventory = cap('host-inventory', 'host-inventory', 'hosts are declared as an inventory the adapter iterates — adding a host is data, not a new code path copied from the last one')
const parallelFanout = cap('parallel-fanout', 'parallel-fanout', 'the same command runs across the inventory in parallel and every result is collected — one slow host does not serialize the fleet, one failure does not hide the others')
const idempotentCopy = cap('idempotent-copy', 'idempotent-copy', 'a push skips hosts whose remote file already matches by checksum — re-running the same sync is cheap and safe, not a blind overwrite of every host every time')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'the work left localhost — a real remote host, or a command that mutates production — so a swallowed failure or a leaked key stops being a local inconvenience',
    triggered: (s) => s.hosts > 0 || s.prod || s.mutatesRemote,
    activates: [exitCodeSurfaced, noSecretLeak],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'more than one host must answer the same command — a fleet — so a single declared host cannot hold the line; the inventory, parallel fan-out, and idempotent copy become mandatory',
    triggered: (s) => s.hosts > 1,
    activates: [hostInventory, parallelFanout, idempotentCopy],
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
