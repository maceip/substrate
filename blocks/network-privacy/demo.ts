// demo.ts — a tiny private-messaging app built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Two users register, get
// introduced, and converse — and the ONLY names that exist in this file are opaque handles;
// there is no variable a peer address could even be assigned to. Run it under different
// PRIVACY_ADAPTER values and the app code is byte-for-byte identical — that is the port
// doing its job. Then the same exchange is fingerprinted under every grade, and the gate
// evaluator runs across three project lifecycles.
//
//   node blocks/network-privacy/demo.ts
//   PRIVACY_ADAPTER=mixnet node blocks/network-privacy/demo.ts

import { connect, checkGrade, currentGrade } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== network-privacy block — adapter grade: ${grade} ===\n`)

const net = await connect()
const alice = await net.register()
const bob = await net.register()
console.log('two users register — each is ONLY a random handle (no address exists above the port):')
console.log(`  alice -> ${alice.handle}`)
console.log(`  bob   -> ${bob.handle}`)

// rendezvous: each side learns the OTHER'S HANDLE and nothing else — discovery without
// address exchange. Before this, a send between them is refused.
await net.introduce(alice.handle, bob.handle)

await net.send(alice.handle, bob.handle, 'hey — this message never carried my location')
await net.send(bob.handle, alice.handle, 'mine neither')
await net.send(alice.handle, bob.handle, 'only the relay knows where either of us lives')

console.log('\nconversation (replies go to a handle, never to an address):')
for (const m of await net.recv(bob.handle)) console.log(`  to bob   <- ${m.from.slice(0, 8)}…  ${m.payload}`)
for (const m of await net.recv(alice.handle)) console.log(`  to alice <- ${m.from.slice(0, 8)}…  ${m.payload}`)
await net.close()

// adapter swap: the SAME two-user exchange, fingerprinted under every grade in a subprocess
const { execFileSync } = await import('node:child_process')
const fp = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, PRIVACY_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
console.log('\nadapter swap (identical observable behavior):')
for (const a of ['broker', 'relay', 'mixnet']) console.log(`  ${a.padEnd(7)} ${fp(a)}`)

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (2 peers, dev)             ', await checkGrade({ peers: 2, prod: false, hostileNetwork: false, messagesPerDay: 40 })))
console.log(fmt('month 2 (40 peers, prod)           ', await checkGrade({ peers: 40, prod: true, hostileNetwork: false, messagesPerDay: 2_000 })))
console.log(fmt('month 9 (public internet, 50k/day) ', await checkGrade({ peers: 900, prod: true, hostileNetwork: true, messagesPerDay: 50_000 })))
console.log('')
