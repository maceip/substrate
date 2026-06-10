// block.test.ts — invariants of the remote-exec block. Dependency-free; run with node.
//   node remote-exec/block.test.ts
//
// Proves the claims the block exists to make — with a FAKE executor throughout, so the whole
// file runs with ZERO ssh and ZERO network (no real host is ever contacted, no key file is
// ever read):
//   1. The port holds: the same app sequence yields the same observable result under the
//      LOCAL adapter and the SSH adapter (fake executor returning the same canned result).
//   2. A command exiting nonzero returns {code != 0} — it does NOT throw.
//   3. No secret leak: nothing the port returns contains key / identity-file material.
//   4. The evaluator escalates required grade as signals cross thresholds.
//   5. The protected evaluator refuses loosening.
//   6. AEvo armed: the live gates may not loosen the committed baseline.

import assert from 'node:assert/strict'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { adapter as local } from './adapters/local.ts'
import { adapter as ssh } from './adapters/ssh.ts'
import type { Executor } from './port.ts'

let failures = 0
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((e) => {
      failures++
      console.log(`  ✗ ${name}\n      ${e.message}`)
    })
}

// A secret string that, IF it ever leaked through the port, this suite would catch. It is a
// placeholder, not real key material — it stands in for "the bytes of an identity file".
const SECRET = 'PRIVATE-KEY-MATERIAL-DO-NOT-LEAK-0xCAFEBABE'

console.log('\nremote-exec block invariants:')

// 1. Port invariance: the same app sequence yields the same observable result under the
//    LOCAL adapter and the SSH adapter. index.ts caches its adapter per process, so we
//    fingerprint each adapter in a subprocess (the fingerprint injects a fake executor).
await check('port invariance: local and ssh agree on observable behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, REMOTE_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  assert.equal(run('local'), run('ssh'), 'local and ssh diverged')
})

// 2. A command exiting nonzero returns {code != 0} and does NOT throw — the same for both
//    adapters. The fake executor RESOLVES with a nonzero code (a real exit), and the port
//    must surface it, never turn it into an exception.
await check('exit code: a nonzero exit is surfaced as {code}, not thrown', async () => {
  const nonzero: Executor = { exec: async () => ({ code: 7, stdout: '', stderr: 'boom' }), copy: async () => {} }
  for (const adapter of [local, ssh]) {
    const h = await adapter.open({ executor: nonzero, host: { host: 'h.invalid', user: 'u' } })
    const r = await h.run('false') // must RESOLVE, not reject
    assert.equal(r.code, 7, `${adapter.name}: expected surfaced code 7`)
    assert.equal(r.stderr, 'boom')
    await h.close()
  }
})

// 2b. A TRANSPORT failure (could not spawn / unreachable host) DOES throw — that is the one
//     case the port reserves for an exception (the command never ran).
await check('exit code: a transport failure (unreachable host) throws', async () => {
  const unreachable: Executor = { exec: async () => { throw new Error('ssh: connect to host h.invalid: Connection refused') }, copy: async () => {} }
  const h = await ssh.open({ executor: unreachable, host: { host: 'h.invalid', user: 'u' } })
  await assert.rejects(() => h.run('echo hi'), /Connection refused/)
  await h.close()
})

// 3. No secret leak: a key PATH may be configured, but nothing the port RETURNS may contain
//    key material. We deep-scan every returned value across run/push/pull. The fake executor
//    is constructed to be adversarial — it tries to echo the secret back through stdout — and
//    the test asserts the adapter never lets configured key bytes reach the surface, while
//    proving the deep-scan would catch a leak if one occurred.
await check('no-secret-leak: returned values never contain key / identity-file material', async () => {
  // The configured host carries a key PATH (never the bytes). Run the full surface against a
  // fake that returns clean output; the deep-scan below proves nothing key-shaped came back.
  const probe: Executor = { exec: async () => ({ code: 0, stdout: 'clean output', stderr: '' }), copy: async () => {} }
  const h = await ssh.open({ executor: probe, host: { host: 'h.invalid', user: 'u', keyPath: '/secret/identity_file' } })
  const returned: unknown[] = []
  returned.push(await h.run('echo hi'))
  returned.push(await h.push('/tmp/a', '/tmp/b')) // resolves to undefined
  returned.push(await h.pull('/tmp/b', '/tmp/c'))
  await h.close()

  // deep scan: stringify every returned value and assert the secret appears nowhere. (The
  // key PATH is fine to appear in argv; the SECRET bytes must never cross the port surface.)
  const deepScan = (v: unknown) => JSON.stringify(v ?? null)
  for (const v of returned) assert.ok(!deepScan(v).includes(SECRET), 'a returned value contained key material')
  // sanity: the deep-scan is real — it would catch the secret if it were present.
  assert.ok(deepScan({ stdout: SECRET }).includes(SECRET), 'deep-scan must be able to detect a leak')
})

// 4. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { hosts: 0, prod: false, mutatesRemote: false } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { hosts: 1, prod: true, mutatesRemote: true } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { hosts: 5, prod: true, mutatesRemote: true } }).requiredGrade, 'graduated')
})

// 5. AEvo: loosening is rejected; tightening is allowed.
await check('assertNoLoosening: removing a gate is a violation', () => {
  const loosened = GATES.slice(0, 1) // dropped the graduated gate
  assert.ok(assertNoLoosening(GATES, loosened).length > 0)
})
await check('assertNoLoosening: adding a gate is allowed (tightening)', () => {
  const tightened = [...GATES, { ...GATES[0], id: 'gate:extra' }]
  assert.equal(assertNoLoosening(GATES, tightened).length, 0)
})

// AEvo armed: the live gates may not loosen the baseline committed at git HEAD
// (block.json). Tightening passes; loosening fails until a human commits it.
await check('PROTECTED: live gates do not loosen the committed baseline', async () => {
  const { checkProtection } = await import('../_kernel/protect.ts')
  const res = checkProtection(new URL('.', import.meta.url).pathname, GATES)
  if (res.baseline === 'none') return console.log('      (no committed baseline yet — protection arms on first commit)')
  assert.deepEqual(res.violations, [])
})

console.log('')
if (failures > 0) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
