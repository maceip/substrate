// app.ts — agent-ops: the user's daily loop as a composed substrate app.
//
// The loop, from the shell-history signal: an agent produces work; it is checked against
// executable contracts; if it passes it ships to a host and is recorded; a local model
// summarizes. The whole point of the north star lives here — the GATE is what lets an
// agent's output ship WITHOUT a human re-driving it. The contracts are code (MOSS); they
// can only be tightened (AEvo); a block failure stops the ship, fail-closed.
//
// Composes six blocks, each imported only via its index.ts:
//   agent-gates (contract check) · remote-exec (ship) · edge-model (summarize) ·
//   persistence (record) · logging (observe) · env (config).

import { gateSet } from '../agent-gates/index.ts'
import type { Artifact, Report } from '../agent-gates/index.ts'
import type { RemoteHost } from '../remote-exec/index.ts'
import type { ModelRuntime } from '../edge-model/index.ts'
import type { BaseRecord, Store } from '../persistence/index.ts'
import type { Logger } from '../logging/index.ts'

export interface RunRecord extends BaseRecord {
  task: string
  shipped: boolean
  failures: string[]
  summary: string
}

export interface Deps {
  host: RemoteHost
  model: ModelRuntime
  store: Store<RunRecord>
  log: Logger
}

// The contracts an agent's output must satisfy before it may ship — executable, not prose.
// An agent registers MORE of these (tighten); the protected baseline forbids removing them.
async function contractGates() {
  const gates = await gateSet()
  gates.register({
    id: 'no-todo',
    severity: 'block',
    describe: 'no TODO/FIXME survives into shipped files',
    check: (a: Artifact) => {
      const hit = (a.files ?? []).find((f) => /TODO|FIXME/.test(f.content))
      return hit ? { pass: false, detail: `${hit.path} still contains TODO/FIXME` } : { pass: true }
    },
  })
  gates.register({
    id: 'claims-have-evidence',
    severity: 'block',
    describe: 'every claim the agent makes cites evidence',
    check: (a: Artifact) => {
      const bad = Object.entries(a.claims ?? {}).filter(([, v]) => !v).map(([k]) => k)
      return bad.length ? { pass: false, detail: `unsupported claims: ${bad.join(', ')}` } : { pass: true }
    },
  })
  gates.register({
    id: 'output-nonempty',
    severity: 'warn',
    describe: 'the agent actually produced output',
    check: (a: Artifact) => (a.output && a.output.length ? { pass: true } : { pass: false, detail: 'empty output' }),
  })
  return gates
}

// runTask: gate the artifact; on pass, ship it through the host and summarize via the local
// model; always record the outcome. Returns the persisted record.
export async function runTask(task: string, artifact: Artifact, deps: Deps): Promise<{ record: RunRecord; report: Report }> {
  const gates = await contractGates()
  const report = gates.evaluate(artifact)
  gates.close()
  deps.log.info('gated', { task, pass: report.pass, failures: report.failures.map((f) => f.id) })

  let shipped = false
  let summary = `blocked: ${report.failures.filter((f) => f.severity === 'block').map((f) => f.id).join(', ')}`
  if (report.pass) {
    // ship: run a deploy command on the host (local adapter by default — safe, no network).
    const res = await deps.host.run(`echo deploying ${task}`)
    shipped = res.code === 0
    // summarize the shipped output with the local edge model (deterministic stub runtime).
    const out = await deps.model.run({ prompt: artifact.output ?? task, tokens: 24 })
    summary = `shipped: ${out.output}`
    deps.log.info('shipped', { task, deploy: res.stdout.trim() })
  } else {
    deps.log.warn('ship blocked by contract', { task, failures: report.failures.map((f) => f.id) })
  }

  const record = await deps.store.create({ task, shipped, failures: report.failures.map((f) => f.id), summary })
  return { record, report }
}
