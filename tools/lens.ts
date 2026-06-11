// tools/lens.ts — THE TWO-LENS CONSTITUTION, as an instrument instead of prose.
//
//   node tools/lens.ts                          take a snapshot, print scorecard + deltas
//   node tools/lens.ts repeat "<what>"          record a REPEAT: a problem bit us although a
//                                               lesson/gate/fix for it already existed
//
// LENS 1 — USER (holds veto): is the human doing less driving and reaching for the tool
// unprompted? Measured from behavior, not claims: the agent-orchestration share of shell
// history (north star: FALLING), and the stamp ledger (revealed preference: did a real new
// project start from create.ts?).
//
// LENS 2 — PAPERS: are the four mechanisms killing repeats? All four papers reduce to one
// promise — never pay for the same thing twice (MOSS: a failure recurs structurally never;
// AEvo: a contract is litigated once; Meta-Agent: a diagnosis attributes instantly next time;
// FoT: a lesson learned anywhere is known everywhere). So the paper metric is the REPEAT RATE
// (target: zero), plus the loop's raw turns: lessons by origin, tightening commits.
// Repeats are recorded by hand for now — detection is a judgment; the ledger makes it a number.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SUB = join(homedir(), '.substrate')
const HISTORY = join(ROOT, 'outputs', 'lens-history.json')

function readJson<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T
  } catch {
    return fallback
  }
}

// ---- repeat ledger -------------------------------------------------------------------------
interface Repeat {
  ts: string
  what: string
}
const repeatsPath = join(SUB, 'repeats.json')

if (process.argv[2] === 'repeat') {
  const what = process.argv.slice(3).join(' ').trim()
  if (!what) {
    console.error('usage: node tools/lens.ts repeat "<what bit us that we already knew>"')
    process.exit(1)
  }
  const list = readJson<Repeat[]>(repeatsPath, [])
  list.unshift({ ts: new Date().toISOString(), what })
  mkdirSync(SUB, { recursive: true })
  writeFileSync(repeatsPath, JSON.stringify(list, null, 2))
  console.log(`repeat recorded (${list.length} total). This is the number the papers exist to drive to zero.`)
  process.exit(0)
}

// ---- lens 1: user --------------------------------------------------------------------------
try {
  execFileSync('python3', [join(ROOT, 'tools', 'mine_shell_history.py')], { stdio: ['ignore', 'ignore', 'ignore'] })
} catch {
  /* miner unavailable — fall back to the last written signal */
}
interface ShellSignal {
  history_lines: number
  capability_invocations: Record<string, number>
}
const signal = readJson<ShellSignal | null>(join(ROOT, 'outputs', 'shell-signal.json'), null)
const orchestration = signal?.capability_invocations['agent-orchestration'] ?? null
const orchestrationShare = signal && orchestration !== null ? orchestration / signal.history_lines : null

interface Stamp {
  name: string
  dir: string
  ts: string
}
const stamps = readJson<Stamp[]>(join(SUB, 'projects.json'), [])

// ---- lens 2: papers ------------------------------------------------------------------------
const repeats = readJson<Repeat[]>(repeatsPath, [])
const fot = readJson<Record<string, { origin: string }[]>>(join(SUB, 'fot-store.json'), {})
const lessons = Object.values(fot).flat()
const byOrigin: Record<string, number> = {}
for (const l of lessons) byOrigin[l.origin] = (byOrigin[l.origin] ?? 0) + 1

interface Snapshot {
  ts: string
  user: { orchestration: number | null; historyLines: number | null; orchestrationShare: number | null; stamps: number }
  papers: { repeats: number; lessons: number; origins: number; tighteningCommits: number | null }
}
const history = readJson<Snapshot[]>(HISTORY, [])
const prev = history[history.length - 1]

let tightenings: number | null = null
try {
  const since = prev?.ts ?? '2026-06-01'
  const out = execFileSync(
    'git',
    ['log', `--since=${since}`, '--oneline', '--', 'blocks/*/gates.ts', 'blocks/*/block.test.ts', 'blocks/*/cases.json'],
    { cwd: ROOT },
  )
  tightenings = out.toString().split('\n').filter(Boolean).length
} catch {
  /* not a git checkout */
}

const snap: Snapshot = {
  ts: new Date().toISOString(),
  user: {
    orchestration,
    historyLines: signal?.history_lines ?? null,
    orchestrationShare: orchestrationShare !== null ? Number(orchestrationShare.toFixed(4)) : null,
    stamps: stamps.length,
  },
  papers: { repeats: repeats.length, lessons: lessons.length, origins: Object.keys(byOrigin).length, tighteningCommits: tightenings },
}
history.push(snap)
if (!existsSync(dirname(HISTORY))) mkdirSync(dirname(HISTORY), { recursive: true })
writeFileSync(HISTORY, JSON.stringify(history, null, 2))

// ---- scorecard -----------------------------------------------------------------------------
const delta = (now: number | null, before: number | null | undefined, downIsGood: boolean) => {
  if (now === null || before === null || before === undefined) return ''
  const d = now - before
  if (d === 0) return '  (no change)'
  const good = downIsGood ? d < 0 : d > 0
  return `  (${d > 0 ? '+' : ''}${Number(d.toFixed(4))} since last — ${good ? 'right direction' : 'WRONG direction'})`
}

console.log('\nLENS 1 — USER (holds veto)')
console.log(`  agent-orchestration share of shell history: ${snap.user.orchestrationShare ?? 'unavailable'}${delta(snap.user.orchestrationShare, prev?.user.orchestrationShare, true)}`)
console.log(`    (${snap.user.orchestration ?? '?'} invocations / ${snap.user.historyLines ?? '?'} lines — share, because history is cumulative)`)
console.log(`  projects stamped (revealed preference): ${snap.user.stamps}${delta(snap.user.stamps, prev?.user.stamps, false)}`)

console.log('\nLENS 2 — PAPERS (one promise: never pay twice)')
console.log(`  REPEATS — already-solved problems that bit again: ${snap.papers.repeats}${delta(snap.papers.repeats, prev?.papers.repeats, true)}`)
console.log(`    record one: node tools/lens.ts repeat "<what>"`)
console.log(`  federated lessons: ${snap.papers.lessons} from ${snap.papers.origins} origin(s) [${Object.entries(byOrigin).map(([o, n]) => `${o}:${n}`).join(', ')}]`)
console.log(`  tightening commits since last snapshot: ${snap.papers.tighteningCommits ?? 'unavailable'} (unprompted-vs-asked: not yet measurable)`)
console.log(`\nsnapshot ${history.length} appended to outputs/lens-history.json\n`)
