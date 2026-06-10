// main.ts — boot agent-ops and run two agent outputs through the loop: one that satisfies the
// contracts (ships) and one that violates them (blocked, fail-closed). Prints the outcome, then
// shows the project-grade dashboard for the behavioral blocks. Self-exits.
//   node blocks/agent-ops/main.ts

import { writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { load } from '../env/index.ts'
import { insights } from '../agent-gates/index.ts'
import { getLogger } from '../logging/index.ts'
import { open as openStore } from '../persistence/index.ts'
import { open as openHost } from '../remote-exec/index.ts'
import { open as openModel } from '../edge-model/index.ts'
import { runTask } from './app.ts'
import type { RunRecord } from './app.ts'

const cfg = await load({ DEPLOY_TARGET: { default: 'localhost', describe: 'where shipped work lands' } })
const log = await getLogger({ service: 'agent-ops' })
const store = await openStore<RunRecord>('agent_runs')
for (const r of await store.list()) await store.remove(r.id) // clean start for the demo
const host = await openHost() // local adapter by default — safe, no network
const model = await openModel()

// give the local model an artifact to "load" (a deterministic stub runtime; no real weights).
const modelFile = join(tmpdir(), 'agent-ops-model.bin')
writeFileSync(modelFile, 'stub-runtime')
await model.fetch({ source: 'file', id: modelFile })

console.log('\n=== agent-ops — the daily loop, composed from six blocks ===\n')
const inherited = insights().length // agent-gates lessons accumulated from prior real runs / projects
console.log(`  FoT: inherited ${inherited} agent-gates lesson(s) from prior runs before doing anything.`)

// 1) a clean agent output: no TODO, every claim has evidence, non-empty.
const good = await runTask(
  'add-rate-limit',
  {
    files: [{ path: 'guard.ts', content: 'export const limit = 100 // done' }],
    output: 'added a fixed-window rate limiter behind the request-guard port',
    claims: { 'tests-pass': true, 'no-secrets-logged': true },
  },
  { host, model, store, log },
)
console.log(`  task "add-rate-limit"  -> shipped=${good.record.shipped}  ${good.record.summary}`)

// 2) a flawed agent output: a TODO survived and a claim has no evidence -> two block failures.
const bad = await runTask(
  'wire-webhook',
  {
    files: [{ path: 'hook.ts', content: 'export function hook() { /* TODO: verify signature */ }' }],
    output: 'wired the webhook',
    claims: { 'signature-verified': false },
  },
  { host, model, store, log },
)
console.log(`  task "wire-webhook"    -> shipped=${bad.record.shipped}  ${bad.record.summary}`)
console.log(`      blocked by: ${bad.report.failures.map((f) => `${f.id}(${f.severity})`).join(', ')}`)

// the record of what happened — the gate decided, not a human.
const runs = await store.list()
console.log(`\n  ${runs.length} runs recorded; ${runs.filter((r) => r.shipped).length} shipped, ${runs.filter((r) => !r.shipped).length} blocked at the contract.`)
const known = insights()
console.log(`  FoT: now ${known.length} lesson(s) in the federation; this run's deposit travels to the next project that pulls agent-gates.`)
if (known[0]) console.log(`       latest: "${known[0].text}" (${known[0].origin})`)

await host.close()
await model.close()
await store.close()
rmSync(modelFile, { force: true })
console.log('')
