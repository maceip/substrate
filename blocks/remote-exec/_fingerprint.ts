// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// REMOTE_ADAPTER selects and prints a stable fingerprint of the observable result. Used by
// block.test.ts to assert port invariance across adapters. The executor is FAKE —
// deterministic canned output for any program (ssh/scp/sh), and a canned non-matching
// sha256sum so the fleet's idempotent push still performs its copy — so this runs with ZERO
// ssh and ZERO network. No key material is ever passed: the host config below uses a key
// PATH that is never read (the fake executor never spawns anything).

import { open } from './index.ts'
import type { Executor } from './index.ts'

// The fake executor: records nothing, just answers. Every command "succeeds" with the same
// canned stdout, so the observable RunResult is identical no matter which adapter built the
// argv. sha256sum returns a digest that will NOT match the local file, so the fleet adapter
// always proceeds to copy (keeping its observable push behavior aligned with local/ssh).
const fakeExecutor: Executor = {
  exec: async (file, args) => {
    if (args.some((a) => a.includes('sha256sum'))) return { code: 0, stdout: '0'.repeat(64) + '  /tmp/x', stderr: '' }
    void file
    return { code: 0, stdout: 'ok', stderr: '' }
  },
  copy: async () => {},
}

const host = { host: 'fingerprint.invalid', user: 'demo', keyPath: '/dev/null' }
const h = await open({ executor: fakeExecutor, host, hosts: [host] })

const r1 = await h.run('echo ok')
await h.push('/tmp/from', '/tmp/to')
await h.pull('/tmp/to', '/tmp/back')
const r2 = await h.run('uname -s')
await h.close()

// Only the OBSERVABLE port surface is fingerprinted: the exit code and the fact that the
// command ran. (stdout text legitimately differs — local runs `sh -c`, the fleet labels per
// host — so we fingerprint the CODE, the determinism the port actually guarantees.)
process.stdout.write(JSON.stringify({ r1Code: r1.code, r2Code: r2.code, ran: true }))
