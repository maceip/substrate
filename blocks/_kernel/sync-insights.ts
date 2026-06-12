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

// CORRECTED Jun 12 (paper actually read, arXiv:2604.16778): the sweet spot is ~20 insights
// PER LIBRARY (one block = one library here), and libraries shrink by LLM consolidation,
// never truncation. The render shows the newest few; consolidation-due warnings are
// per-block, against the store's SWEET_SPOT.
import { SWEET_SPOT, consolidationDue } from './fot.ts'
const RENDER_CAP = 8

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

const due = consolidationDue()
if (due.length) {
  console.log(
    `\nCONSOLIDATION DUE (past the paper's ~${SWEET_SPOT}/library sweet spot): ` +
      due.map((d) => `${d.block}:${d.count}`).join(', ') +
      ` — merge via LLM consolidation (cluster -> synthesize), never delete. Total federation-wide: ${total}.`,
  )
}
