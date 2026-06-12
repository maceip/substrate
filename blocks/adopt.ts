// adopt.ts — bring substrate INTO an existing repo (the brownfield entry path).
//
// create.ts gives birth to a NEW project; adopt.ts moves substrate into a repo that already
// exists. Built from the brownfield probes (outputs/brownfield-probes-jun12.md):
//
//   - DEFAULT is LESSONS-ONLY: write a boundary manifest, register the repo in the precedent
//     index, and merge an agent-contract section into its AGENTS.md. NO code enters. This is
//     the right amount of substrate for a mature repo that already owns its infrastructure
//     (probe 3 / OpenClaw: zero block code crossed, correctly — only the text layer traveled).
//
//   - --blocks a,b,c does SELECTIVE adoption: vendor ONLY the named blocks (the capabilities
//     the repo LACKS) under <repo>/substrate/. Coexist by default; the protocol governs only
//     the adopted capabilities — substrate.json is the per-capability boundary, never per-repo.
//
//   node blocks/adopt.ts <repo-dir> [--blocks cache,request-guard] [--app-dirs src,lib]
//
// Honest v1 limits (recorded, not hidden): selective adoption copies blocks in substrate's
// zero-build .ts form. If the host is NodeNext with .js-extension imports, importing our
// index.ts needs a host-convention rewrite — flagged in the manifest, automated in v2. The
// wrap generator (a host's own DB behind our port) is also v2.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
function flag(name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}
const targetArg = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true) ?? argv.find((a) => !a.startsWith('--'))
if (!targetArg) {
  console.error('usage: node blocks/adopt.ts <repo-dir> [--blocks a,b,c] [--app-dirs src,lib]')
  process.exit(1)
}
const target = resolve(targetArg)
if (!existsSync(target) || !statSync(target).isDirectory()) {
  console.error(`not a directory: ${target} — adopt brings substrate INTO an existing repo (use create.ts for a new one)`)
  process.exit(1)
}

const requested = (flag('blocks') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const appDirs = (flag('app-dirs') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

// The catalog of adoptable blocks (same definition create.ts uses).
const allBlocks = readdirSync(here, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
  .map((e) => e.name)
  .filter((n) => !['nursery-app', 'fot-proof', 'agent-ops', 'node_modules'].includes(n))
const unknown = requested.filter((b) => !allBlocks.includes(b))
if (unknown.length) {
  console.error(`unknown block(s): ${unknown.join(', ')}\nadoptable: ${allBlocks.sort().join(', ')}`)
  process.exit(1)
}
const mode = requested.length ? 'selective' : 'lessons-only'

// Detect host module dialect (probe 4 finding: typeless package -> our .ts is CJS to NodeNext).
let hostDialect = 'unknown'
try {
  const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8')) as { type?: string }
  hostDialect = pkg.type === 'module' ? 'esm' : 'commonjs-or-typeless'
} catch {
  /* no package.json */
}

let nurserySha = 'unknown'
try {
  nurserySha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: here }).toString().trim()
} catch {
  /* nursery outside git */
}

// --- SELECTIVE: vendor only the named blocks + kernel, under <repo>/substrate/ -------------
const copied: string[] = []
if (mode === 'selective') {
  const keep = (src: string) => !src.includes('/.data') && !src.endsWith('.DS_Store')
  const sub = join(target, 'substrate')
  mkdirSync(sub, { recursive: true })
  cpSync(join(here, '_kernel'), join(sub, '_kernel'), { recursive: true, filter: keep })
  for (const b of requested) {
    cpSync(join(here, b), join(sub, b), { recursive: true, filter: keep })
    copied.push(b)
  }
  // Namespaced test script (merge-not-overwrite) so substrate's suite never clobbers theirs.
  try {
    const pkgPath = join(target, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string>; dependencies?: Record<string, string> }
    pkg.scripts = pkg.scripts ?? {}
    if (!pkg.scripts['substrate:test']) {
      pkg.scripts['substrate:test'] = copied.map((b) => `node substrate/${b}/block.test.ts`).join(' && ')
    }
    pkg.dependencies = { zod: '^4.4.3', ...pkg.dependencies } // ecosystem-backed adapters; host's pin wins on conflict
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  } catch {
    /* no package.json — adopted blocks still run via `node substrate/<b>/block.test.ts` */
  }
}

// --- MANIFEST: the per-capability boundary (every check scopes to this) --------------------
const manifestPath = join(target, 'substrate.json')
let manifest: { mode: string; adopted: string[]; appDirs: string[]; hostDialect: string; origin: { nursery: string; sha: string }; ts?: string; notes?: string[] }
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch {
  manifest = { mode, adopted: [], appDirs: appDirs.length ? appDirs : ['.'], hostDialect, origin: { nursery: here, sha: nurserySha } }
}
manifest.mode = mode === 'selective' || manifest.mode === 'selective' ? 'selective' : 'lessons-only'
manifest.adopted = [...new Set([...manifest.adopted, ...copied])].sort()
if (appDirs.length) manifest.appDirs = appDirs
manifest.hostDialect = hostDialect
manifest.origin = { nursery: here, sha: nurserySha }
manifest.notes = [
  'The protocol governs ONLY the capabilities in `adopted` (per-capability boundary, never per-repo).',
  'COEXIST is the default: the repo keeps its own infra; substrate supplies what it LACKS.',
  hostDialect === 'esm'
    ? 'Host is ESM — substrate .ts files import cleanly.'
    : 'Host is CommonJS/typeless — import adopted blocks from a .mts island or run them via `node substrate/<block>/...`; a host-convention rewrite is a v2 feature.',
]
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

// --- AGENT CONTRACT: merge a substrate section into AGENTS.md (never overwrite) ------------
const agentsPath = join(target, 'AGENTS.md')
const MARK_BEGIN = '<!-- substrate:adopted:begin -->'
const MARK_END = '<!-- substrate:adopted:end -->'
const section = `${MARK_BEGIN}
## substrate (adopted — ${mode})

This repo has adopted substrate capabilities. The boundary is \`substrate.json\` — the protocol
governs ONLY the listed \`adopted\` blocks, nothing else in this repo (coexist by default).

- **Adopted blocks:** ${manifest.adopted.length ? manifest.adopted.join(', ') : '(none yet — lessons-only)'}.
  ${manifest.adopted.length ? 'Import them from `substrate/<block>/index.ts` only; never from `adapters/`.' : ''}
- **Lessons travel even with no code:** read a block\'s distilled lessons before building on its
  capability; the federation store lives at \`~/.substrate/fot-store.json\` (outside any repo).
- **Where a block fits a gap, prefer it over hand-rolling.** Where nothing fits, hand-roll in
  your own code and mark the site \`// HANDROLLED: <why>\` — it is harvested as demand signal.
- **Do NOT replace this repo\'s existing infrastructure** (its DB, server, logger) with blocks.
  substrate supplies what the repo lacks; wrapping existing infra behind a port is opt-in only.
${MARK_END}`

let agentsBody = ''
try {
  agentsBody = readFileSync(agentsPath, 'utf8')
} catch {
  /* no AGENTS.md yet */
}
if (agentsBody.includes(MARK_BEGIN)) {
  agentsBody = agentsBody.slice(0, agentsBody.indexOf(MARK_BEGIN)) + section + agentsBody.slice(agentsBody.indexOf(MARK_END) + MARK_END.length)
} else {
  agentsBody = agentsBody.trimEnd() + (agentsBody.trim() ? '\n\n' : '') + section + '\n'
}
writeFileSync(agentsPath, agentsBody)

// --- PRECEDENT INDEX: register so harvest/steward/precedent see this repo ------------------
try {
  const ledger = join(homedir(), '.substrate', 'projects.json')
  const list = existsSync(ledger) ? (JSON.parse(readFileSync(ledger, 'utf8')) as Record<string, unknown>[]) : []
  const existing = list.find((p) => p.dir === target)
  if (existing) Object.assign(existing, { name: basename(target), adopted: true, mode, appDirs: manifest.appDirs })
  else list.push({ name: basename(target), dir: target, adopted: true, mode, appDirs: manifest.appDirs, ts: nurserySha })
  mkdirSync(dirname(ledger), { recursive: true })
  writeFileSync(ledger, JSON.stringify(list, null, 2))
} catch {
  /* ledger unavailable — adoption still works */
}

// --- federation reach (read-only) ---------------------------------------------------------
let lessons = 0
try {
  const store = JSON.parse(readFileSync(join(homedir(), '.substrate', 'fot-store.json'), 'utf8')) as Record<string, unknown[]>
  lessons = Object.values(store).reduce((n, l) => n + l.length, 0)
} catch {
  /* empty federation */
}

console.log(`\nsubstrate adopted into ${target}  (mode: ${mode})`)
console.log(`  manifest: substrate.json  (boundary = ${manifest.adopted.length ? manifest.adopted.join(', ') : 'lessons-only, no code'})`)
if (copied.length) console.log(`  vendored: ${copied.join(', ')} + _kernel under substrate/  (run: npm run substrate:test)`)
console.log(`  agent contract: ${agentsBody.includes(MARK_BEGIN) ? 'AGENTS.md substrate section written' : 'AGENTS.md created'}`)
console.log(`  host dialect: ${hostDialect}${hostDialect !== 'esm' && copied.length ? '  (see manifest note: import via .mts island or node)' : ''}`)
console.log(`  federation: ${lessons} lesson(s) available to this repo's agents`)
console.log(`  registered in the precedent index (harvest + steward now see this repo).\n`)
