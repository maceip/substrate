// adapters/nursery.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: an in-process predicate runner. register() collects
// gates; evaluate() runs every one against the artifact. It is FAIL-CLOSED from minute one — a gate
// whose check() THROWS is recorded as a 'block'-level failure with the thrown reason, never swallowed
// (guarantee 1) — and a single 'block' failure forces report.pass=false (guarantee 2). No baseline
// protection and no attribution, so it tops out at `nursery`: real enough for the first agent loop and
// for tests, before any gate has fired. App code does not change one character moving up from here.

import type { Adapter, Artifact, Gate, GateSet, Report, Severity } from '../port.ts'

// Run one gate fail-closed. A thrown predicate becomes a 'block' failure — the whole point: an
// exception is the LEAST safe time to assume the work passed.
function runGate(gate: Gate, artifact: Artifact): { ok: true } | { ok: false; detail: string } {
  let result
  try {
    result = gate.check(artifact)
  } catch (e) {
    return { ok: false, detail: `gate threw: ${e instanceof Error ? e.message : String(e)}` }
  }
  if (result.pass) return { ok: true }
  return { ok: false, detail: result.detail ?? 'failed (no detail)' }
}

class NurseryGateSet implements GateSet {
  private gates: Gate[] = []

  register(gate: Gate): void {
    this.gates.push(gate)
  }

  evaluate(artifact: Artifact): Report {
    const failures: Report['failures'] = []
    for (const gate of this.gates) {
      const r = runGate(gate, artifact)
      if (!r.ok) failures.push({ id: gate.id, severity: gate.severity, detail: r.detail })
    }
    // guarantee 2: pass iff no BLOCKING failure. A warn is surfaced but never alone fails the report.
    const pass = !failures.some((f) => f.severity === 'block')
    return { pass, failures }
  }

  list(): { id: string; severity: Severity }[] {
    return this.gates.map((g) => ({ id: g.id, severity: g.severity }))
  }

  close(): void {}
}

export const adapter: Adapter = {
  name: 'nursery',
  maxGrade: 'nursery',
  capabilities: ['fail-closed', 'block-severity-stops'], // the two guarantees the port makes everywhere
  open(): GateSet {
    return new NurseryGateSet()
  },
}

// Shared by elementary/graduated so fail-closed means the same thing at every grade.
export { runGate }
