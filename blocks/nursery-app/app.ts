// app.ts — a notes service composed from FOUR blocks, each imported only via its index.ts:
//   env (config) · logging · persistence (store) · transport (router).
//
// The app names no adapter, no engine, no grade. It wires block surfaces together — exactly
// the Meta-Agent claim: blocks compose by their boundary contracts. buildNotesRouter takes its
// store + logger injected so it composes the same way under a socket (main.ts) or in-process
// (app.test.ts).

import type { BaseRecord, Store } from '../persistence/index.ts'
import type { Logger } from '../logging/index.ts'
import type { Router } from '../transport/index.ts'
import { createRouter } from '../transport/index.ts'
import { validate } from '../input-validation/index.ts'
import type { Schema } from '../input-validation/index.ts'
import { guard } from '../request-guard/index.ts'

export interface Note extends BaseRecord {
  title: string
  body: string
}

type NewNote = Omit<Note, keyof BaseRecord>

// The note input contract — validated at the boundary by the input-validation block.
export const NOTE_SCHEMA: Schema = {
  title: { type: 'string', required: true, min: 1, max: 200 },
  body: { type: 'string', max: 10_000 },
}

// The env shape this service needs. Imported by main.ts; also drives the env grade check.
export const ENV_SPEC = {
  PORT: { default: '3000', parse: (s: string) => Number(s), describe: 'http listen port' },
  LOG_LEVEL: { default: 'info', describe: 'logger level' },
  DATABASE_URL: { required: true, secret: true, describe: 'database connection string' },
}

export interface Deps {
  store: Store<Note>
  log: Logger
  rateLimit?: number // requests per minute per caller (default 1000)
}

export async function buildNotesRouter(deps: Deps): Promise<Router> {
  const router = await createRouter()
  const limiter = await guard({ limit: deps.rateLimit ?? 1000, windowMs: 60_000 })
  const validateNote = validate(NOTE_SCHEMA)

  // The boundary pipeline — FOUR blocks meeting at the transport seam, in order:
  //   logging (observe) -> request-guard (rate-limit/shield) -> input-validation (writes).
  router.use((req) => {
    deps.log.info('request', { method: req.method, path: req.path })
    return null
  })
  router.use((req) => limiter(req))
  router.use((req) => (req.method === 'POST' || req.method === 'PUT' ? validateNote(req) : null))

  router.route('GET', '/notes', async () => ({ status: 200, body: await deps.store.list() }))

  router.route('POST', '/notes', async (req) => {
    // title is guaranteed present + typed by the validate middleware above.
    const b = req.body as { title: string; body?: string }
    const note = await deps.store.create({ title: b.title, body: b.body ?? '' } as NewNote)
    deps.log.info('note created', { id: note.id })
    return { status: 201, body: note }
  })

  router.route('GET', '/notes/:id', async (req) => {
    const note = await deps.store.get(req.params.id)
    return note ? { status: 200, body: note } : { status: 404, body: { error: 'not found' } }
  })

  router.route('DELETE', '/notes/:id', async (req) => {
    const ok = await deps.store.remove(req.params.id)
    return { status: ok ? 204 : 404, body: null }
  })

  return router
}
