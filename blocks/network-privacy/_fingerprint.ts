// _fingerprint.ts — test helper. Runs a fixed two-user exchange against whatever adapter
// PRIVACY_ADAPTER selects and prints a stable fingerprint of the observable result.
// Used by block.test.ts to assert port invariance across adapters. Handles and nonces are
// random per run, so the fingerprint records derived facts (shapes, matches, counts), never
// raw values; received payloads are sorted because arrival order is not part of the
// contract (the mix batch may reorder).

import { connect, HANDLE_SHAPE } from './index.ts'

const t = await connect()
const a = await t.register()
const b = await t.register()

const handleShape = HANDLE_SHAPE.test(a.handle) && HANDLE_SHAPE.test(b.handle) && a.handle !== b.handle

// discovery is explicit: a send before the rendezvous must be refused at every grade
let preIntro = 'sent'
try {
  await t.send(a.handle, b.handle, 'too early')
} catch {
  preIntro = 'refused'
}

await t.introduce(a.handle, b.handle)
const r1 = await t.send(a.handle, b.handle, 'hello')
const r2 = await t.send(a.handle, b.handle, 'again')
const r3 = await t.send(b.handle, a.handle, 'hi back')

const atB = await t.recv(b.handle)
const atA = await t.recv(a.handle)
const emptied = (await t.recv(b.handle)).length
await t.close()

process.stdout.write(
  JSON.stringify({
    handleShape,
    preIntro,
    bGot: atB.map((e) => e.payload).sort(),
    bFromA: atB.every((e) => e.from === a.handle),
    aGot: atA.map((e) => e.payload).sort(),
    aFromB: atA.every((e) => e.from === b.handle),
    receiptsDistinct: new Set([r1.id, r2.id, r3.id, r1.nonce, r2.nonce, r3.nonce]).size === 6,
    emptied,
  }),
)
