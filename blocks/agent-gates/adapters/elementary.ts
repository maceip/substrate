// adapters/elementary.ts — ELEMENTARY grade (the DEFAULT)
//
// Everything nursery does (fail-closed, block-severity-stops) PLUS a protected-baseline check on the
// gate set itself. The idea is the AEvo idea modelled in _kernel/protect.ts / assertNoLoosening, but
// applied to the ARTIFACT gates an app registers rather than to the block's own grade gates: a gate id
// that was committed to the baseline may not be REMOVED or DOWNGRADED (block -> warn). open() accepts a
// committed gate-id list (the snapshot a human approved); register() refuses any loosening of it the
// moment it is called, so the contract an agent self-checks against can be TIGHTENED freely but only
// LOOSENED by editing the committed snapshot — a separate, human act. Single process, in-proc, so it
// tops out at `elementary`. App code does not change moving here from nursery.

import type { Adapter, Artifact, Gate, GateSet, Report, Severity } from '../port.ts'
import { runGate } from './nursery.ts'

type Committed = { id: string; severity: Severity }

// The loosening check, modelled on _kernel/grade.assertNoLoosening: a committed gate may not vanish,
// and a committed 'block' gate may not be downgraded to 'warn'. Tightening (adding gates, or raising a
// 'warn' to 'block') is silent and allowed. Returns the violations, or [] when the proposed set holds.
function assertNoGateLoosening(committed: Committed[], proposed: Committed[]): string[] {
  const violations: string[] = []
  const byId = new Map(proposed.map((g) => [g.id, g]))
  for (const c of committed) {
    const p = byId.get(c.id)
    if (!p) {
      violations.push(`gate ${c.id} was removed (loosening — needs human approval)`)
      continue
    }
    if (c.severity === 'block' && p.severity === 'warn')
      violations.push(`gate ${c.id} downgraded block->warn (loosening — needs human approval)`)
  }
  return violations
}

class ElementaryGateSet implements GateSet {
  private gates: Gate[] = []
  private committed: Committed[]

  constructor(committed: Committed[]) {
    this.committed = committed
  }

  // register refuses a registration that would leave the live set loosening the committed baseline.
  // Refusal is loud (throws) — a silent drop is exactly the failure mode this grade exists to prevent.
  register(gate: Gate): void {
    const proposed = [...this.gates.map((g) => ({ id: g.id, severity: g.severity })), { id: gate.id, severity: gate.severity }]
    const violations = assertNoGateLoosening(this.committed, proposed)
    if (violations.length > 0) throw new Error(`protected-baseline: ${violations.join('; ')}`)
    this.gates.push(gate)
  }

  evaluate(artifact: Artifact): Report {
    const failures: Report['failures'] = []
    for (const gate of this.gates) {
      const r = runGate(gate, artifact)
      if (!r.ok) failures.push({ id: gate.id, severity: gate.severity, detail: r.detail })
    }
    const pass = !failures.some((f) => f.severity === 'block')
    return { pass, failures }
  }

  list(): Committed[] {
    return this.gates.map((g) => ({ id: g.id, severity: g.severity }))
  }

  close(): void {}
}

export const adapter: Adapter = {
  name: 'elementary',
  maxGrade: 'elementary',
  capabilities: ['fail-closed', 'block-severity-stops', 'protected-baseline'],
  open(opts?: { committedGateIds?: Committed[] }): GateSet {
    return new ElementaryGateSet(opts?.committedGateIds ?? [])
  },
}

export { assertNoGateLoosening }
