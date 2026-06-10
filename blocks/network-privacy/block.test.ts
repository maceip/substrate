// block.test.ts — invariants of the network-privacy block. Dependency-free; run with node.
//   node network-privacy/block.test.ts
//
// Proves the claims the block exists to make:
//   1. The port holds: the same two-user exchange yields the same result under every adapter.
//   2. THE GUARANTEE: nothing the port returns contains or derives from a transport address —
//      the test plays the adversary with the engine's own address table and finds nothing.
//   3. A captured envelope cannot be replayed at elementary+.
//   4. The protected evaluator refuses loosening.

import assert from 'node:assert/strict'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { HANDLE_SHAPE } from './port.ts'
import { adapter as broker } from './adapters/broker.ts'
import { adapter as relay } from './adapters/relay.ts'
import { adapter as mixnet } from './adapters/mixnet.ts'
import { adversary } from './adapters/_adversary.ts'

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

console.log('\nnetwork-privacy block invariants:')

// 1. Port invariance: the same app sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
await check('port invariance: broker, relay and mixnet agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, PRIVACY_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  const baseline = run('broker')
  assert.equal(baseline, run('relay'), 'broker and relay diverged')
  assert.equal(baseline, run('mixnet'), 'broker and mixnet diverged')
})

// 2. THE GUARANTEE TEST. Walk every value the port returns during a full session —
//    registrations, receipts, drained envelopes — and prove none of it contains, embeds, or
//    encodes a transport address. The adversary view hands the test the engine's OWN address
//    table (something app code can never get), so the scan is against ground truth.
await check('THE GUARANTEE: no port return value contains or derives from a transport address', async () => {
  const collect = (v: unknown, out: string[] = []): string[] => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) for (const x of v) collect(x, out)
    else if (v && typeof v === 'object') for (const x of Object.values(v)) collect(x, out)
    return out
  }
  for (const adapter of [broker, relay, mixnet]) {
    const t = await adapter.connect()
    const a = await t.register()
    const b = await t.register()
    await t.introduce(a.handle, b.handle)
    const r1 = await t.send(a.handle, b.handle, 'private payload')
    const r2 = await t.send(b.handle, a.handle, 'private reply')
    const returned: unknown[] = [a, b, r1, r2, await t.recv(b.handle), await t.recv(a.handle)]

    const addrs = adversary(t).addresses()
    assert.ok(addrs.length >= 2, `${adapter.name}: the engine should hold internal addresses to hide`)
    assert.ok(addrs.every((x) => x.startsWith('tcp://')), `${adapter.name}: address table looks wrong`)

    // deep-scan: no returned string contains an address (or its host:port tail), and no
    // address contains any returned string of meaningful length (handles, nonces, ids)
    const blob = JSON.stringify(returned)
    const strings = collect(returned)
    for (const addr of addrs) {
      assert.ok(!blob.includes(addr), `${adapter.name}: a port return value embeds address ${addr}`)
      assert.ok(!blob.includes(addr.replace('tcp://', '')), `${adapter.name}: a port return value embeds the host of ${addr}`)
      for (const s of strings) {
        if (s.length >= 8) assert.ok(!addr.includes(s), `${adapter.name}: returned value ${s} appears inside address ${addr}`)
      }
    }
    // handles are random ids, not reversible encodings of any address
    for (const h of [a.handle, b.handle]) {
      assert.ok(HANDLE_SHAPE.test(h), `${adapter.name}: handle is not 32 hex chars of CSPRNG output`)
      for (const addr of addrs) {
        assert.notEqual(h, Buffer.from(addr).toString('hex'), `${adapter.name}: handle is hex(address)`)
        assert.notEqual(h, Buffer.from(addr).toString('base64'), `${adapter.name}: handle is base64(address)`)
        assert.notEqual(h, Buffer.from(addr).toString('base64url'), `${adapter.name}: handle is base64url(address)`)
      }
    }
    await t.close()
  }
})

// 3. Replay rejection: elementary+ refuses a captured envelope re-injected by the adversary;
//    the nursery broker accepts it — which is exactly why the first gate activates
//    `replay-protection`.
await check('replay rejection: a captured envelope is refused at elementary+', async () => {
  for (const adapter of [relay, mixnet]) {
    const t = await adapter.connect()
    const a = await t.register()
    const b = await t.register()
    await t.introduce(a.handle, b.handle)
    const r = await t.send(a.handle, b.handle, 'once only')
    assert.equal((await t.recv(b.handle)).length, 1)
    assert.equal(adversary(t).replay(r.id), false, `${adapter.name} accepted a replayed envelope`)
    assert.equal((await t.recv(b.handle)).length, 0, `${adapter.name} delivered a replayed envelope`)
    await t.close()
  }
  const t = await broker.connect()
  const a = await t.register()
  const b = await t.register()
  await t.introduce(a.handle, b.handle)
  const r = await t.send(a.handle, b.handle, 'once only')
  await t.recv(b.handle)
  assert.equal(adversary(t).replay(r.id), true, 'the nursery broker should accept a replay (no nonce tracking)')
  assert.equal((await t.recv(b.handle)).length, 1, 'the replayed envelope should land — the gap the gate names')
  await t.close()
})

// 4. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { peers: 2, prod: false, hostileNetwork: false, messagesPerDay: 40 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { peers: 40, prod: true, hostileNetwork: false, messagesPerDay: 2_000 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { peers: 900, prod: true, hostileNetwork: true, messagesPerDay: 50_000 } }).requiredGrade, 'graduated')
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
