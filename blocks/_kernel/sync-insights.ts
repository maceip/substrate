// _kernel/sync-insights.ts — render each block's federated lessons into its insights.md.
//
// insights.md is the human-readable view; the federation store (fot.ts) is the source of
// truth that actually travels between projects. This script is the bridge: it rewrites the
// marked section below from the live store. Hand-edits inside the markers are overwritten —
// deposit lessons with fot.deposit(), not by editing the file. The curated prose above the
// markers stays untouched.
//   node _kernel/sync-insights.ts

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { recall } from './fot.ts'

const blocksDir = dirname(dirname(fileURLToPath(import.meta.url)))
const BEGIN = '<!-- fot:federated:begin -->'
const END = '<!-- fot:federated:end -->'

// The FoT paper's finding: past ~50-70 insights the library stops helping (context dilution).
// The read unit is one block's insights.md (agent contract rule 4), so the render is capped
// per block; the federation-wide total is watched below — past SATURATION, consolidation
// (merging near-duplicate lessons into stronger ones) is due, which is judgment work, not sync.
const RENDER_CAP = 8
const SATURATION = 60

let total = 0
for (const entry of readdirSync(blocksDir, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue
  const file = join(blocksDir, entry.name, 'insights.md')
  if (!existsSync(file)) continue

  const lessons = recall(entry.name)
  total += lessons.length
  const shown = lessons.slice(0, RENDER_CAP)
  const overflow = lessons.length - shown.length
  const body = lessons.length
    ? shown.map((i) => `- ${i.text} *(${i.origin}, ${i.ts.slice(0, 10)})*`).join('\n') +
      (overflow > 0 ? `\n- _…plus ${overflow} older lesson(s) in the store — consolidation due._` : '')
    : '_None yet — lessons deposited via the federation store appear here._'
  const section = `${BEGIN}\n## Federated lessons (auto-synced from the FoT store — do not edit by hand)\n\n${body}\n${END}`

  const md = readFileSync(file, 'utf8')
  const next = md.includes(BEGIN)
    ? md.replace(md.slice(md.indexOf(BEGIN), md.indexOf(END) + END.length), section)
    : `${md.trimEnd()}\n\n${section}\n`
  if (next !== md) {
    writeFileSync(file, next)
    console.log(`synced     ${entry.name}/insights.md (${lessons.length} lesson(s))`)
  } else {
    console.log(`up-to-date ${entry.name}/insights.md (${lessons.length} lesson(s))`)
  }
}

if (total > SATURATION) {
  console.log(
    `\nWARNING: ${total} lessons federation-wide — past the ~${SATURATION} mark where the FoT paper ` +
      `finds insight libraries stop helping. Consolidation is due: merge near-duplicates into ` +
      `stronger lessons in the store (judgment work — the librarian's job, not sync's).`,
  )
}
