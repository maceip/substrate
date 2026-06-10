// demo.ts — a tiny deploy-shaped operation built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. The default (LOCAL / nursery)
// runs for real on localhost with zero network: a harmless command, a push+pull round-trip
// through real temp files. Then it shows the ADAPTER SWAP to the ssh grade WITH AN INJECTED
// FAKE EXECUTOR (run in a child process, because index.ts caches one adapter per process) —
// the app sequence is byte-for-byte identical and the observable result (exit codes) matches
// the local run, which is the port doing its job. Finally it runs the gate evaluator across a
// project lifecycle. Temp files are cleaned up; it exits on its own.
//
//   node blocks/remote-exec/demo.ts
//   REMOTE_ADAPTER=ssh node blocks/remote-exec/demo.ts   (the swap below shows it with a fake
//                                                          executor — no real host needed)

import { open, checkGrade, currentGrade } from './index.ts'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

const grade = await currentGrade()
console.log(`\n=== remote-exec block — adapter grade: ${grade} ===\n`)

// --- The app sequence, run for REAL on localhost (LOCAL / nursery, zero network) ---------
const dir = await mkdtemp(join(tmpdir(), 'remote-exec-demo-'))
const src = join(dir, 'build.txt')
const dest = join(dir, 'deployed.txt')
const back = join(dir, 'roundtrip.txt')
await writeFile(src, 'artifact v1\n')

const host = await open() // default adapter: local
const uname = await host.run('uname -s') // a harmless command
await host.push(src, dest) // "deploy" the artifact (copies on localhost)
await host.pull(dest, back) // pull it back
const restored = (await readFile(back, 'utf8')).trim()
await host.close()

console.log('local (nursery) run — real, on localhost:')
console.log(`  run('uname -s') -> code ${uname.code}, stdout: ${uname.stdout.trim()}`)
console.log(`  push+pull round-trip restored: "${restored}"`)

// --- The SAME app sequence under the ssh grade, via the shared _fingerprint helper -------
// index.ts caches one adapter per process, so the swap runs in a child: _fingerprint.ts
// drives the SAME app calls through whichever REMOTE_ADAPTER is selected, with an INJECTED
// FAKE EXECUTOR (zero ssh, zero network). We fingerprint local and ssh and assert they agree
// on the observable surface (exit codes) — the port absorbing localhost -> one ssh host.
const fpPath = new URL('./_fingerprint.ts', import.meta.url).pathname
const fingerprint = (adapter: string) => execFileSync(process.execPath, [fpPath], { env: { ...process.env, REMOTE_ADAPTER: adapter }, encoding: 'utf8' }).trim()
const localFp = fingerprint('local')
const sshFp = fingerprint('ssh')

console.log('\nadapter swap (local -> ssh), each driven through index.ts with a fake executor:')
console.log(`  local fingerprint: ${localFp}`)
console.log(`  ssh   fingerprint: ${sshFp}`)
console.log(`  identical observable result: ${localFp === sshFp ? 'yes — the port held' : 'NO — divergence!'}`)
console.log('  (a nonzero exit would be SURFACED as {code}, not thrown; only an unreachable host throws.)')
console.log('  key material never crosses the port: ssh -i carries a key PATH, never the bytes.')

// --- Gate dashboard across the project lifecycle -----------------------------------------
console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (localhost, dev)          ', await checkGrade({ hosts: 0, prod: false, mutatesRemote: false })))
console.log(fmt('month 2 (1 ssh host, prod deploy) ', await checkGrade({ hosts: 1, prod: true, mutatesRemote: true })))
console.log(fmt('month 9 (5-host fleet fan-out)    ', await checkGrade({ hosts: 5, prod: true, mutatesRemote: true })))

// --- Clean up ----------------------------------------------------------------------------
await rm(dir, { recursive: true, force: true })
console.log('')
