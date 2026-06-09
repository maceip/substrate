// proof.test.ts — THE FoT TEST: did a lesson cross a repo boundary without being hand-copied?
//
// Runs project-a and project-b as SEPARATE node processes that share only a federation store
// (a temp FOT_STORE). project-b never imports project-a. We assert:
//   1. before A deposits, B recalls nothing (no pre-seeding);
//   2. after A deposits, a fresh B process recalls A's exact lesson, with origin preserved;
//   3. project-b's source contains no reference to project-a (the crossing is via the store).
//
//   node blocks/fot-proof/proof.test.ts

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const store = join(tmpdir(), 'substrate-fot-proof.json')
try {
  rmSync(store)
} catch {}

function run(file: string, project: string): string {
  return execFileSync(process.execPath, [join(here, file)], {
    env: { ...process.env, FOT_STORE: store, PROJECT: project },
    encoding: 'utf8',
  })
}

let failures = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`)
  }
}

console.log('\nFoT proof — lesson crossing a repo boundary:')

check('store starts empty: project-b recalls nothing before A deposits', () => {
  const before = run('project-b.ts', 'project-b')
  assert.ok(before.includes('recalled 0'), `expected 0 lessons, got:\n${before}`)
})

check('project-a deposits a lesson into the federation', () => {
  const a = run('project-a.ts', 'project-a')
  assert.ok(a.includes('deposited'), `project-a did not deposit:\n${a}`)
})

check('project-b (separate process, never imports A) recalls A’s lesson', () => {
  const after = run('project-b.ts', 'project-b')
  assert.ok(after.includes('recalled 1'), `expected 1 lesson, got:\n${after}`)
  assert.ok(after.includes('EBUSY'), 'the specific lesson text did not cross')
  assert.ok(after.includes('from project-a'), 'the origin was not preserved across the boundary')
})

check('the crossing is via the federation, not an import: project-b never imports project-a', () => {
  const src = readFileSync(join(here, 'project-b.ts'), 'utf8')
  const importsA = /(?:from|import)\s*\(?\s*['"][^'"]*project-a/.test(src)
  assert.ok(!importsA, 'project-b imports project-a — that would be hand-copying, not FoT')
})

check('idempotent / merged-not-appended: depositing again does not duplicate', () => {
  run('project-a.ts', 'project-a')
  const after = run('project-b.ts', 'project-b')
  assert.ok(after.includes('recalled 1'), `lesson was duplicated instead of merged:\n${after}`)
})

console.log('')
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('FoT proven: a lesson traveled project-a → federation → project-b with zero hand-copying.\n')
