// _kernel/render-catalog.ts — generate CATALOG.md from CATALOG.json. Edit the JSON, never the md.
//   node blocks/_kernel/render-catalog.ts

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const blocksDir = dirname(dirname(fileURLToPath(import.meta.url)))
const cat = JSON.parse(readFileSync(join(blocksDir, 'CATALOG.json'), 'utf8')) as {
  classes: Record<string, { name: string; gate: string }>
  blocks: { name: string; grain: string; status: string; cluster: string; classes: string[]; summary: string; invariant: string | null; port: { in: string; out: string } | null; buildsOn: string[]; evidence: string[] }[]
}

const built = cat.blocks.filter((b) => b.status === 'built')
const ops = cat.blocks.filter((b) => b.grain === 'operation')
const clusters = [...new Set(ops.map((b) => b.cluster))]

let md = `# Block Catalog — GENERATED from CATALOG.json (do not edit; run _kernel/render-catalog.ts)

**${cat.blocks.length} blocks: ${built.length} built, ${cat.blocks.length - built.length} defined.**
A block is one entry in CATALOG.json. Built blocks also have a folder (port.ts, adapters/, gates.ts,
insights.md, PROTECTED, tests). Links are three kinds: **buildsOn** (composition), **classes**
(invariant-class gate library), **evidence** (repos proving recurrence).

## The four invariant classes (the gate library)

| class | name | gate |
|---|---|---|
${Object.entries(cat.classes)
  .map(([id, c]) => `| ${id} | ${c.name} | \`${c.gate}\` |`)
  .join('\n')}

## Infrastructure (${cat.blocks.filter((b) => b.grain === 'infrastructure').length} — all built)

| block | summary |
|---|---|
${cat.blocks
  .filter((b) => b.grain === 'infrastructure')
  .map((b) => `| **${b.name}** | ${b.summary} |`)
  .join('\n')}

## Operations (${ops.length} — verb grain)
`

for (const cluster of clusters) {
  const list = ops.filter((b) => b.cluster === cluster)
  md += `\n### ${cluster} (${list.length})\n\n| op | classes | port | summary |\n|---|---|---|---|\n`
  md += list.map((b) => `| **${b.name}**${b.status === 'built' ? ' ✓built' : ''} | ${b.classes.join(',') || '—'} | ${b.port ? `${b.port.in} → ${b.port.out}` : '—'} | ${b.summary} |`).join('\n')
  md += '\n'
}

writeFileSync(join(blocksDir, 'CATALOG.md'), md)
console.log(`rendered CATALOG.md (${cat.blocks.length} blocks)`)
