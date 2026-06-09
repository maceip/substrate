// main.ts — boot the composed notes service, smoke-test it over a real socket, print the
// project-wide grade dashboard, shut down cleanly.
//   node blocks/nursery-app/main.ts

import { load } from '../env/index.ts'
import { getLogger } from '../logging/index.ts'
import { open } from '../persistence/index.ts'
import { ENV_SPEC, buildNotesRouter } from './app.ts'
import type { Note } from './app.ts'
import { gradeReport, printReport } from './project.ts'
import { measureSignals } from '../_kernel/signals.ts'

// Required secret for the demo (a real deploy supplies this via the env source).
process.env.DATABASE_URL ??= 'postgres://localhost/dev'

const cfg = await load(ENV_SPEC)
const log = await getLogger({ service: 'notes' })
const store = await open<Note>('app_notes')
for (const n of await store.list()) await store.remove(n.id) // clean start for the demo

const router = await buildNotesRouter({ store, log })

console.log('\n=== nursery-app — six blocks composed ===')
const listening = await router.listen(Number(cfg.PORT) === 3000 ? 0 : Number(cfg.PORT))
log.info('listening', { url: listening.url })

const created = await (await fetch(`${listening.url}/notes`, { method: 'POST', body: JSON.stringify({ title: 'first', body: 'hello' }) })).json()
await fetch(`${listening.url}/notes`, { method: 'POST', body: JSON.stringify({ title: 'second', body: 'world' }) })
const all = (await (await fetch(`${listening.url}/notes`)).json()) as Note[]
console.log(`\n  GET /notes -> ${all.length} notes:`, all.map((n: Note) => `${n.title} v${n.version}`).join(', '))
const missingTitle = await fetch(`${listening.url}/notes`, { method: 'POST', body: JSON.stringify({ body: 'no title' }) })
console.log(`  POST /notes without title -> ${missingTitle.status} (boundary validation)`)

await listening.close()

// The project-wide grade dashboard: first MEASURED from this checkout (the sensor half of
// "graduation is organic" — _kernel/signals.ts), then three hand-authored what-if scenarios.
const sample = created as object
const measured = measureSignals(new URL('.', import.meta.url).pathname, { rows: await store.count() })
printReport(`measured from this checkout (${measured.writers} writer file(s), ${measured.instances} instance(s))`, await gradeReport(measured, sample, ENV_SPEC))
printReport('day 1 (1 writer, dev, private)', await gradeReport({ writers: 1, instances: 1, prod: false, rows: 2, public: false }, sample, ENV_SPEC))
printReport('launch (public prod, 1 instance)', await gradeReport({ writers: 3, instances: 1, prod: true, rows: 800, public: true }, sample, ENV_SPEC))
printReport('scale (4 instances, 120k rows)', await gradeReport({ writers: 6, instances: 4, prod: true, rows: 120_000, public: true }, sample, ENV_SPEC))
console.log('')
