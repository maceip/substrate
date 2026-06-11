// _kernel/check-catalog.ts — the block schema as a PREDICATE.
//
//   node blocks/_kernel/check-catalog.ts        (exit 1 on violation)
//
// CATALOG.json is the registry of record for every block, built or defined. Agents get
// confused, distracted, and creative; this check is what keeps the representation stable
// anyway. It validates: required fields per status, enums, name uniqueness, link resolution
// (every buildsOn names a real catalog entry), class references, and built-block consistency
// (dir exists, block.json name matches, every block folder appears in the catalog).

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const blocksDir = dirname(dirname(fileURLToPath(import.meta.url)))
const errors: string[] = []

interface Entry {
  name: string
  grain: string
  status: string
  cluster: string
  classes: string[]
  summary: string
  invariant: string | null
  port: { in: string; out: string } | null
  buildsOn: string[]
  evidence: string[]
  dir: string | null
}
interface Catalog {
  version: number
  classes: Record<string, { name: string; gate: string }>
  blocks: Entry[]
}

let cat: Catalog
try {
  cat = JSON.parse(readFileSync(join(blocksDir, 'CATALOG.json'), 'utf8')) as Catalog
} catch (e) {
  console.error(`CATALOG.json unreadable: ${(e as Error).message}`)
  process.exit(1)
}

const names = new Set<string>()
const classIds = new Set(Object.keys(cat.classes))
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

for (const b of cat.blocks) {
  const who = `block "${b.name ?? '(unnamed)'}"`
  if (!b.name || !KEBAB.test(b.name)) errors.push(`${who}: name must be kebab-case`)
  if (names.has(b.name)) errors.push(`${who}: duplicate name`)
  names.add(b.name)
  if (!['infrastructure', 'operation'].includes(b.grain)) errors.push(`${who}: bad grain "${b.grain}"`)
  if (!['built', 'defined'].includes(b.status)) errors.push(`${who}: bad status "${b.status}"`)
  if (!b.summary) errors.push(`${who}: summary required`)
  if (!Array.isArray(b.evidence) || b.evidence.length === 0) errors.push(`${who}: evidence required (the reuse proof)`)
  for (const c of b.classes ?? []) if (!classIds.has(c)) errors.push(`${who}: unknown invariant class "${c}"`)
  if (b.grain === 'operation') {
    if (!b.port?.in || !b.port?.out) errors.push(`${who}: operations must state port {in, out} domain-free`)
    if (!b.invariant && (b.classes ?? []).length === 0) errors.push(`${who}: operations need an invariant or at least one class`)
  }
  if (b.status === 'built') {
    if (!b.dir) errors.push(`${who}: built blocks must have dir`)
    else {
      const abs = join(dirname(blocksDir), b.dir)
      if (!existsSync(abs)) errors.push(`${who}: dir ${b.dir} does not exist`)
      else {
        try {
          const bj = JSON.parse(readFileSync(join(abs, 'block.json'), 'utf8')) as { block: string }
          if (bj.block !== b.name) errors.push(`${who}: block.json says "${bj.block}"`)
        } catch {
          errors.push(`${who}: ${b.dir}/block.json unreadable`)
        }
      }
    }
  } else if (b.dir) errors.push(`${who}: defined blocks must have dir null`)
}

// every buildsOn edge resolves
for (const b of cat.blocks) for (const dep of b.buildsOn ?? []) if (!names.has(dep)) errors.push(`block "${b.name}": buildsOn "${dep}" is not in the catalog`)

// every built block folder appears in the catalog (no orphan folders)
const NON_BLOCKS = new Set(['nursery-app', 'fot-proof', 'agent-ops', 'node_modules'])
for (const e of readdirSync(blocksDir, { withFileTypes: true })) {
  if (!e.isDirectory() || e.name.startsWith('_') || e.name.startsWith('.') || NON_BLOCKS.has(e.name)) continue
  if (!names.has(e.name)) errors.push(`folder blocks/${e.name} exists but is not in CATALOG.json`)
}

if (errors.length) {
  console.error(`CATALOG INVALID — ${errors.length} violation(s):`)
  for (const err of errors) console.error(`  - ${err}`)
  process.exit(1)
}
const built = cat.blocks.filter((b) => b.status === 'built').length
const defined = cat.blocks.filter((b) => b.status === 'defined').length
console.log(`check-catalog: ${cat.blocks.length} blocks valid (${built} built, ${defined} defined), all links resolve`)
