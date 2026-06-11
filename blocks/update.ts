// update.ts — the UPDATE CHANNEL: bring a stamped project's blocks back in sync with the
// nursery. This closes the fork-on-stamp problem (design review Jun 11, #1): without it,
// every stamp is a create-react-app freeze and upstream fixes reach no one.
//
//   node blocks/update.ts <project-dir>        (run from the nursery)
//
// Why this is safe by construction: substrate/ in a stamped project is SYSTEM-OWNED — app
// code lives in app/ and imports each block's index.ts only. So replacing substrate/ wholesale
// cannot touch project code. The contract:
//   - requires a CLEAN git tree in the target (the whole update is one `git checkout .` from undone)
//   - replaces _kernel + every nursery block; preserves each block's runtime .data/
//   - leaves unknown dirs in substrate/ alone (e.g. agent-ops from older stamps) — reported, not deleted
//   - merges nursery runtime deps into the project's package.json; NEVER touches scripts
//     (the test script is project-owned after stamping)
//   - runs the project's own `npm test`: green → commits the update; red → leaves the working
//     tree for inspection and prints the revert command. Fail-closed, never half-applied silently.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const targetArg = process.argv[2]
if (!targetArg) {
  console.error('usage: node blocks/update.ts <project-dir>')
  process.exit(1)
}
const target = resolve(targetArg)
const sub = join(target, 'substrate')
if (!existsSync(sub) || !existsSync(join(target, 'app'))) {
  console.error(`${target} does not look like a stamped project (no substrate/ + app/)`)
  process.exit(1)
}

const git = (...args: string[]) => execFileSync('git', args, { cwd: target, stdio: ['ignore', 'pipe', 'pipe'] }).toString()
try {
  if (git('status', '--porcelain').trim() !== '') {
    console.error('target git tree is not clean — commit or stash first so the update is one `git checkout .` from undone')
    process.exit(1)
  }
} catch {
  console.error('target is not a git repository — the update channel requires revertability')
  process.exit(1)
}

// Same definition of "a block" as create.ts.
const blocks = readdirSync(here, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
  .map((e) => e.name)
  .filter((n) => !['nursery-app', 'fot-proof', 'agent-ops', 'node_modules'].includes(n))
  .sort()
const keep = (src: string) => !src.includes('/.data') && !src.endsWith('.DS_Store')

const added: string[] = []
const replaced: string[] = []
for (const unit of ['_kernel', ...blocks]) {
  const dst = join(sub, unit)
  const dataDir = join(dst, '.data')
  const dataTmp = join(sub, `.data-tmp-${unit}`)
  const hadData = existsSync(dataDir)
  if (hadData) renameSync(dataDir, dataTmp)
  if (existsSync(dst)) {
    rmSync(dst, { recursive: true })
    replaced.push(unit)
  } else {
    added.push(unit)
  }
  cpSync(join(here, unit), dst, { recursive: true, filter: keep })
  if (hadData) renameSync(dataTmp, join(dst, '.data'))
}
const unknown = readdirSync(sub, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== '_kernel' && !blocks.includes(e.name))
  .map((e) => e.name)

// Merge nursery runtime deps (e.g. zod) into the project. Scripts stay project-owned.
const nurseryPkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
const pkgPath = join(target, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { dependencies?: Record<string, string> }
pkg.dependencies = { ...pkg.dependencies, ...nurseryPkg.dependencies }
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

let nurserySha = 'unknown'
try {
  nurserySha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: here }).toString().trim()
} catch {
  /* nursery outside git */
}
mkdirSync(sub, { recursive: true })
writeFileSync(join(sub, '.origin.json'), JSON.stringify({ nursery: here, sha: nurserySha, ts: new Date().toISOString() }, null, 2) + '\n')

try {
  execFileSync('npm', ['install', '--no-fund', '--no-audit'], { cwd: target, stdio: ['ignore', 'pipe', 'pipe'] })
} catch {
  console.error('warning: npm install failed — ecosystem-backed grades may not run until deps install')
}

// Chokepoint sync: an update is also the moment the project's rendered lessons refresh.
try {
  execFileSync('node', [join(sub, '_kernel/sync-insights.ts')], { stdio: ['ignore', 'ignore', 'ignore'] })
} catch {
  /* non-fatal — the nursery's rendered insights.md arrived with the copy regardless */
}

console.log(`\nupdating ${target} from nursery @ ${nurserySha}`)
console.log(`  replaced: ${replaced.length} units; added: ${added.length}${added.length ? ` (${added.join(', ')})` : ''}`)
if (unknown.length) console.log(`  left alone (not in nursery): ${unknown.join(', ')}`)

console.log('  running the project’s own test suite...')
try {
  execFileSync('npm', ['test'], { cwd: target, stdio: ['ignore', 'pipe', 'pipe'] })
  git('add', '-A')
  git('commit', '-m', `substrate update from nursery @ ${nurserySha}`)
  console.log('  tests GREEN — update committed.\n')
} catch (e) {
  const out = (e as { stdout?: Buffer }).stdout?.toString().split('\n').filter(Boolean).slice(-15).join('\n  ') ?? String(e)
  console.error(`  tests RED — update left UNCOMMITTED for inspection. Tail:\n  ${out}`)
  console.error(`\n  revert with:  git -C ${target} checkout . && git -C ${target} clean -fd substrate\n`)
  process.exit(1)
}
