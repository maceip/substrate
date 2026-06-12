// _kernel/harvest.ts — encode the user-test learning loop as a standing mechanism.
//
// The Jun-12 user tests proved the loop works (HANDROLLED markers = demand, friction =
// lessons, projects = precedent) — but a human collected all of it. This makes collection
// mechanical: scan every stamped project for (a) the blocks it actually imports, (b) its
// HANDROLLED markers, (c) what it is (README title line). The enriched ledger becomes the
// PRECEDENT INDEX ("have we already built this?") and every NEW gap marker is recorded as
// evidence — markers accumulate toward sealed batches, so recurring gaps justify a rewrite/
// build cycle mechanically instead of through conversation.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { recordEvidence } from './evidence.ts'

interface Handrolled {
  file: string
  line: number
  why: string
}
export interface ProjectFacts {
  name: string
  dir: string
  ts?: string
  description: string
  blocksUsed: string[]
  handrolled: Handrolled[]
}

function scanTs(dir: string, out: { rel: string; text: string }[], base = dir): void {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && !e.name.startsWith('.')) scanTs(p, out, base)
      continue
    }
    if (/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push({ rel: p.slice(base.length + 1), text: readFileSync(p, 'utf8') })
  }
}

export function harvestProject(name: string, dir: string): ProjectFacts | null {
  const appDir = join(dir, 'app')
  if (!existsSync(appDir)) return null
  const files: { rel: string; text: string }[] = []
  scanTs(appDir, files)

  const blocksUsed = new Set<string>()
  const handrolled: Handrolled[] = []
  for (const f of files) {
    for (const m of f.text.matchAll(/from\s+['"][^'"]*substrate\/([a-z0-9-]+)\/index\.ts['"]/g)) blocksUsed.add(m[1])
    f.text.split('\n').forEach((line, i) => {
      const m = line.match(/HANDROLLED:?\s*(.+)/)
      if (m) handrolled.push({ file: `app/${f.rel}`, line: i + 1, why: m[1].trim().slice(0, 160) })
    })
  }

  let description = ''
  try {
    const readme = readFileSync(join(dir, 'README.md'), 'utf8')
    description = (readme.split('\n').find((l) => l.trim() && !l.startsWith('#')) ?? '').trim().slice(0, 160)
  } catch {
    /* no README */
  }
  return { name, dir, description, blocksUsed: [...blocksUsed].sort(), handrolled }
}

// harvestAll: enrich the stamp ledger in place; record evidence for gap markers not seen
// before (dedup by normalized marker text, so re-harvesting is idempotent).
export function harvestAll(): { projects: ProjectFacts[]; newGaps: number } {
  const sub = process.env.SUBSTRATE_HOME ?? join(homedir(), '.substrate')
  const ledgerPath = join(sub, 'projects.json')
  if (!existsSync(ledgerPath)) return { projects: [], newGaps: 0 }
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as (ProjectFacts & { ts?: string })[]

  const seenPath = join(sub, 'harvested-gaps.json')
  const seen = new Set<string>(existsSync(seenPath) ? (JSON.parse(readFileSync(seenPath, 'utf8')) as string[]) : [])
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').slice(0, 80)

  const projects: ProjectFacts[] = []
  let newGaps = 0
  for (const entry of ledger) {
    if (!existsSync(entry.dir)) continue
    const facts = harvestProject(entry.name, entry.dir)
    if (!facts) continue
    facts.ts = entry.ts
    Object.assign(entry, facts)
    projects.push(facts)
    for (const h of facts.handrolled) {
      const key = norm(h.why)
      if (seen.has(key)) continue
      seen.add(key)
      newGaps++
      recordEvidence('block-gaps', 'handrolled-marker', `${entry.name} ${h.file}:${h.line} — ${h.why}`, entry.name)
    }
  }
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2))
  writeFileSync(seenPath, JSON.stringify([...seen], null, 2))
  return { projects, newGaps }
}
