// app.test.ts — composition proof. Builds the notes service from real blocks and exercises
// CRUD through the transport port's IN-PROCESS dispatch (no socket), with a memory store and a
// captured logger. Asserts the blocks actually compose: a POST routes through transport, lands
// in persistence, and emits a log line. node blocks/nursery-app/app.test.ts
//
// Run under the memory persistence adapter so it's hermetic.
process.env.PERSIST_ADAPTER = 'memory'

import assert from 'node:assert/strict'
import { open } from '../persistence/index.ts'
import type { Logger } from '../logging/index.ts'
import { buildNotesRouter } from './app.ts'
import type { Note } from './app.ts'

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

function captureLogger(): { log: Logger; lines: string[] } {
  const lines: string[] = []
  const mk = (): Logger => ({
    debug: (m) => lines.push(`debug ${m}`),
    info: (m) => lines.push(`info ${m}`),
    warn: (m) => lines.push(`warn ${m}`),
    error: (m) => lines.push(`error ${m}`),
    child: () => mk(),
  })
  return { log: mk(), lines }
}

console.log('\nnursery-app composition:')

await check('POST routes through transport -> persists in store -> logs', async () => {
  const store = await open<Note>('compose_notes')
  for (const n of await store.list()) await store.remove(n.id)
  const { log, lines } = captureLogger()
  const router = await buildNotesRouter({ store, log })

  const created = await router.handle('POST', '/notes', { body: { title: 't', body: 'b' } })
  assert.equal(created.status, 201)
  const note = created.body as Note
  assert.equal(note.title, 't')
  assert.equal(note.version, 1)

  // persistence really has it
  assert.equal(await store.count(), 1)
  assert.deepEqual(await store.get(note.id), note)

  // logging really fired (request + note created)
  assert.ok(lines.some((l) => l.includes('request')))
  assert.ok(lines.some((l) => l.includes('note created')))
})

await check('GET /notes/:id round-trips the param', async () => {
  const store = await open<Note>('compose_notes2')
  for (const n of await store.list()) await store.remove(n.id)
  const { log } = captureLogger()
  const router = await buildNotesRouter({ store, log })
  const created = (await router.handle('POST', '/notes', { body: { title: 'x', body: '' } })).body as Note
  const got = await router.handle('GET', `/notes/${created.id}`)
  assert.equal(got.status, 200)
  assert.equal((got.body as Note).id, created.id)
})

await check('boundary validation (input-validation block): POST without title -> 400, nothing persisted', async () => {
  const store = await open<Note>('compose_notes3')
  for (const n of await store.list()) await store.remove(n.id)
  const { log } = captureLogger()
  const router = await buildNotesRouter({ store, log })
  const res = await router.handle('POST', '/notes', { body: { body: 'no title' } })
  assert.equal(res.status, 400)
  assert.deepEqual((res.body as { error: string }).error, 'validation failed')
  assert.equal(await store.count(), 0)
})

await check('boundary guard (request-guard block): over rate limit -> 429', async () => {
  const store = await open<Note>('compose_notes4')
  for (const n of await store.list()) await store.remove(n.id)
  const { log } = captureLogger()
  const router = await buildNotesRouter({ store, log, rateLimit: 2 })
  const headers = { 'x-client': 'spammer' }
  assert.equal((await router.handle('GET', '/notes', { headers })).status, 200)
  assert.equal((await router.handle('GET', '/notes', { headers })).status, 200)
  assert.equal((await router.handle('GET', '/notes', { headers })).status, 429) // third trips the limiter
})

console.log('')
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
