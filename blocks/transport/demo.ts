// demo.ts — transport against ./index.ts only. Binds a real ephemeral port and calls itself.
//   node blocks/transport/demo.ts

import { createRouter, checkGrade, currentGrade } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== transport block — server grade: ${grade} ===\n`)

const router = await createRouter()
const store = new Map<string, { id: string; text: string }>()

router.use((req) => (req.method === 'POST' && !req.body ? { status: 400, body: { error: 'body required' } } : null))
router.route('GET', '/items', () => ({ status: 200, body: [...store.values()] }))
router.route('POST', '/items', (req) => {
  const id = String(store.size + 1)
  const item = { id, text: (req.body as { text: string }).text }
  store.set(id, item)
  return { status: 201, body: item }
})
router.route('GET', '/items/:id', (req) => {
  const item = store.get(req.params.id)
  return item ? { status: 200, body: item } : { status: 404, body: { error: 'not found' } }
})

const listening = await router.listen(0)
console.log(`listening on ${listening.url}`)

const post = await fetch(`${listening.url}/items`, { method: 'POST', body: JSON.stringify({ text: 'hello' }) })
console.log(`POST /items -> ${post.status}`, await post.json())
const list = await fetch(`${listening.url}/items`)
console.log(`GET  /items -> ${list.status}`, await list.json())
const one = await fetch(`${listening.url}/items/1`)
console.log(`GET  /items/1 -> ${one.status}`, await one.json())
await listening.close()

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation:')
console.log(fmt('day 1   (private, dev)    ', await checkGrade({ public: false, prod: false, instances: 1 })))
console.log(fmt('public  (1 instance)      ', await checkGrade({ public: true, prod: true, instances: 1 })))
console.log(fmt('scaled  (4 instances)     ', await checkGrade({ public: true, prod: true, instances: 4 })))
console.log('')
