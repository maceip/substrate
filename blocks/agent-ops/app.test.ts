// app.test.ts — the composition test for agent-ops. Proves the behavioral loop end to end:
// a clean artifact ships and is recorded; a contract-violating artifact is blocked fail-closed
// and nothing ships. Six blocks composing by their boundary contracts (the Meta-Agent claim).
//   node agent-ops/app.test.ts

process.env.PERSIST_ADAPTER = 'memory' // isolate the test store; no .data on disk

import assert from 'node:assert/strict'
import { writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getLogger } from '../logging/index.ts'
import { open as openStore } from '../persistence/index.ts'
import { open as openHost } from '../remote-exec/index.ts'
import { open as openModel } from '../edge-model/index.ts'
import { runTask } from './app.ts'
import type { RunRecord } from './app.ts'

let failures = 0
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`)
  }
}

console.log('\nagent-ops composition:')

const log = await getLogger({ service: 'agent-ops-test' })
const store = await openStore<RunRecord>('agent_runs_test')
const host = await openHost()
const model = await openModel()
const modelFile = join(tmpdir(), 'agent-ops-test-model.bin')
writeFileSync(modelFile, 'stub')
await model.fetch({ source: 'file', id: modelFile })
const deps = { host, model, store, log }

const clean = {
  files: [{ path: 'ok.ts', content: 'export const x = 1' }],
  output: 'did the thing',
  claims: { evidence: true },
}
const dirty = {
  files: [{ path: 'bad.ts', content: '// TODO: finish' }],
  output: 'half did it',
  claims: { evidence: false },
}

await check('a clean artifact passes the contract, ships, and is recorded', async () => {
  const { record, report } = await runTask('clean', clean, deps)
  assert.equal(report.pass, true)
  assert.equal(record.shipped, true)
  assert.deepEqual(record.failures, [])
  assert.ok(record.summary.startsWith('shipped:'), 'expected an edge-model summary')
})

await check('a TODO + unsupported claim block the ship fail-closed; nothing ships', async () => {
  const { record, report } = await runTask('dirty', dirty, deps)
  assert.equal(report.pass, false)
  assert.equal(record.shipped, false)
  assert.deepEqual(record.failures.sort(), ['claims-have-evidence', 'no-todo'])
})

await check('the store recorded both runs — the gate decided, not a human', async () => {
  const runs = await store.list()
  assert.equal(runs.length, 2)
  assert.equal(runs.filter((r) => r.shipped).length, 1)
})

await host.close()
await model.close()
await store.close()
rmSync(modelFile, { force: true })

console.log('')
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
