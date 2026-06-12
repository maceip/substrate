// _kernel/check-anatomy.ts — PROTOCOL SEGMENTS S1-S3, block side, as a predicate.
//
//   node blocks/_kernel/check-anatomy.ts        (exit 1 on violation)
//
// The conserved reading frame: every BUILT block must carry the seam (port.ts + index.ts),
// graded adapters (adapters/ with >=1 implementation, grades declared in block.json),
// executable gates (gates.ts + gates declared), federation surface (insights.md), the
// ratchet's anchor (PROTECTED + block.json), and its own invariant tests (block.test.ts).
// Free regions (extra files) are never checked — the protocol governs the core, not the rest.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const blocksDir = dirname(dirname(fileURLToPath(import.meta.url)))
const errors: string[] = []

interface CatalogEntry {
  name: string
  status: string
  dir: string | null
}
const cat = JSON.parse(readFileSync(join(blocksDir, 'CATALOG.json'), 'utf8')) as { blocks: CatalogEntry[] }

const CORE_FILES = ['port.ts', 'index.ts', 'gates.ts', 'block.json', 'insights.md', 'PROTECTED', 'block.test.ts']

for (const b of cat.blocks.filter((x) => x.status === 'built')) {
  const dir = join(dirname(blocksDir), b.dir!)
  for (const f of CORE_FILES) {
    if (!existsSync(join(dir, f))) errors.push(`${b.name}: missing conserved file ${f}`)
  }
  const adaptersDir = join(dir, 'adapters')
  if (!existsSync(adaptersDir) || readdirSync(adaptersDir).filter((f) => f.endsWith('.ts')).length === 0) {
    errors.push(`${b.name}: adapters/ missing or empty (S2)`)
  }
  try {
    const bj = JSON.parse(readFileSync(join(dir, 'block.json'), 'utf8')) as { grades?: unknown[]; gates?: unknown[]; protected?: string[] }
    if (!Array.isArray(bj.grades) || bj.grades.length === 0) errors.push(`${b.name}: block.json declares no grades (S2)`)
    if (!Array.isArray(bj.gates)) errors.push(`${b.name}: block.json declares no gates baseline (S3/S4)`)
    if (!bj.protected?.includes('port.ts') || !bj.protected?.includes('gates.ts')) {
      errors.push(`${b.name}: block.json protected[] must cover port.ts and gates.ts (S4)`)
    }
  } catch {
    errors.push(`${b.name}: block.json unreadable`)
  }
}

if (errors.length) {
  console.error(`ANATOMY VIOLATIONS — the conserved reading frame is broken (${errors.length}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`check-anatomy: ${cat.blocks.filter((x) => x.status === 'built').length} built blocks carry the conserved core (S1-S4 anchors present)`)
