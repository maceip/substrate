// adapters/graduated.ts — GRADUATED grade (the highest)
//
// Everything elementary does (fail-closed, block-severity-stops, protected-baseline) PLUS failure
// ATTRIBUTION (the Meta-Agent paper): every failure is labelled with WHERE it originates, so a human
// is pointed at the right place instead of re-driving the agent blind. The three labels are the port's
// Attribution type:
//   structural — the gate itself could not run (its check() threw): the contract/harness is broken,
//                not the artifact. This is the fail-closed path, and it is ALWAYS 'structural'.
//   upstream   — the artifact relies on something it did not produce: a claim with no evidence, an
//                unmet dependency. The fix is not in this artifact's own bytes.
//   local      — this artifact's own content broke the contract (a TODO it shipped, a malformed diff).
//                The agent's own output is at fault and is where the fix lives.
//
// Attribution for a non-throwing failure is derived from the failing gate's own detail: a failure that
// speaks of a missing claim / absent evidence / unmet dependency is 'upstream'; everything else is the
// artifact's own content, hence 'local'. A thrown gate is 'structural' by construction. This keeps
// attribution executable (MOSS) — it is computed, never hand-typed onto a report.
//
// Single process, in-proc — no server, no deps — but it is the TOP grade because it satisfies every
// requirement the elementary->graduated gate activates (protected-baseline AND failure-attribution).
// App code does not change one character moving here from elementary; report.attribution just turns on.

import type { Adapter, Artifact, Attribution, Failure, Gate, GateSet, Report, Severity } from '../port.ts'
import { runGate } from './nursery.ts'
import { assertNoGateLoosening } from './elementary.ts'

type Committed = { id: string; severity: Severity }

// Words in a failure's detail that mean "the artifact leaned on something it did not produce" —
// an unsubstantiated claim or an unmet dependency. Matched case-insensitively. Tightening this set
// (adding markers) only ever moves more failures off 'local'; it never hides a failure.
const UPSTREAM_MARKERS = ['claim', 'evidence', 'dependency', 'upstream', 'unmet', 'missing reference', 'undocumented source']

// Attribute one failure. A thrown gate (the fail-closed path) is ALWAYS structural — the contract
// could not even run. Otherwise the failure is the artifact's own, classified upstream vs local by
// whether its detail describes leaning on something the artifact did not produce.
function attribute(detail: string, threw: boolean): Attribution {
  if (threw) return 'structural'
  const d = detail.toLowerCase()
  return UPSTREAM_MARKERS.some((m) => d.includes(m)) ? 'upstream' : 'local'
}

class GraduatedGateSet implements GateSet {
  private gates: Gate[] = []
  private committed: Committed[]

  constructor(committed: Committed[]) {
    this.committed = committed
  }

  // Same protected-baseline refusal as elementary: a committed gate may not be removed or downgraded
  // (block->warn) without a human committing the loosened baseline. Loud refusal, never a silent drop.
  register(gate: Gate): void {
    const proposed = [...this.gates.map((g) => ({ id: g.id, severity: g.severity })), { id: gate.id, severity: gate.severity }]
    const violations = assertNoGateLoosening(this.committed, proposed)
    if (violations.length > 0) throw new Error(`protected-baseline: ${violations.join('; ')}`)
    this.gates.push(gate)
  }

  evaluate(artifact: Artifact): Report {
    const failures: Failure[] = []
    for (const gate of this.gates) {
      const r = runGate(gate, artifact)
      if (r.ok) continue
      // A thrown gate's detail begins 'gate threw:' (runGate's contract) — that IS the structural signal.
      const threw = r.detail.startsWith('gate threw:')
      failures.push({ id: gate.id, severity: gate.severity, detail: r.detail, attribution: attribute(r.detail, threw) })
    }
    const pass = !failures.some((f) => f.severity === 'block')
    return { pass, failures, attribution: true }
  }

  list(): Committed[] {
    return this.gates.map((g) => ({ id: g.id, severity: g.severity }))
  }

  close(): void {}
}

export const adapter: Adapter = {
  name: 'graduated',
  maxGrade: 'graduated',
  capabilities: ['fail-closed', 'block-severity-stops', 'protected-baseline', 'failure-attribution'],
  open(opts?: { committedGateIds?: Committed[] }): GateSet {
    return new GraduatedGateSet(opts?.committedGateIds ?? [])
  },
}

export { attribute }
