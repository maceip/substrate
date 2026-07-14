// create.test.ts — product entry-point regressions.
//
// Block tests are not enough: create/adopt are what a smart block copilot would call.
// These tests prove generated projects are runnable and selective adoption stays bounded.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)

let failures = 0
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`)
  }
}

function withFastNpmHome(): { home: string; path: string } {
  const home = mkdtempSync(join(tmpdir(), 'substrate-entry-home-'))
  const bin = join(home, 'bin')
  mkdirSync(bin, { recursive: true })
  const npm = join(bin, 'npm')
  writeFileSync(npm, '#!/bin/sh\nexit 0\n')
  chmodSync(npm, 0o755)
  return { home, path: `${bin}:${process.env.PATH ?? ''}` }
}

function runCreate(args: string[], targetName?: string): string {
  const env = withFastNpmHome()
  const scratch = mkdtempSync(join(tmpdir(), 'substrate-create-'))
  const target = targetName ? join(scratch, targetName) : scratch
  if (!targetName) rmSync(target, { recursive: true, force: true })
  execFileSync(process.execPath, [join(here, 'create.ts'), target, ...args], {
    cwd: root,
    env: { ...process.env, HOME: env.home, PATH: env.path },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return target
}

function blockDirs(project: string): string[] {
  return execFileSync('find', ['substrate', '-maxdepth', '1', '-mindepth', '1', '-type', 'd'], { cwd: project })
    .toString()
    .split('\n')
    .filter(Boolean)
    .map((p) => p.replace(/^substrate\//, ''))
    .filter((p) => p !== '_kernel')
    .sort()
}

function runAppSmoke(project: string): void {
  execFileSync(process.execPath, ['app/smoke.test.ts'], {
    cwd: project,
    env: { ...process.env, PORT: '0', PERSIST_ADAPTER: 'memory' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
  })
}

console.log('\ncreate/adopt entry-point invariants:')

await check('create default stamps the small runnable base', () => {
  const p = runCreate(['default-app'])
  assert.deepEqual(blockDirs(p), ['env', 'logging', 'transport'])
  const pkg = JSON.parse(readFileSync(join(p, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
  assert.match(pkg.scripts.test, /app\/smoke\.test\.ts/)
  runAppSmoke(p)
})

await check('create --blocks adds capabilities on top of the base and the app starts', () => {
  const p = runCreate(['plus-app', '--blocks', 'persistence,input-validation,request-guard'])
  assert.deepEqual(blockDirs(p), ['env', 'input-validation', 'logging', 'persistence', 'request-guard', 'transport'])
  const main = readFileSync(join(p, 'app/main.ts'), 'utf8')
  for (const spec of main.matchAll(/from '..\/substrate\/([^/]+)\/index\.ts'/g)) {
    assert.ok(blockDirs(p).includes(spec[1]), `app imports missing block ${spec[1]}`)
  }
  runAppSmoke(p)
})

await check('generated app starts when its project path contains spaces', () => {
  const p = runCreate(['space-app'], 'project with space')
  runAppSmoke(p)
})

await check('adopt --blocks vendors only requested blocks and keeps host test script', () => {
  const env = withFastNpmHome()
  const p = mkdtempSync(join(tmpdir(), 'substrate-adopt-'))
  writeFileSync(join(p, 'package.json'), JSON.stringify({ name: 'host', scripts: { test: 'echo host-test' } }, null, 2) + '\n')
  execFileSync(process.execPath, [join(here, 'adopt.ts'), p, '--blocks', 'cache,request-guard', '--app-dirs', 'src'], {
    cwd: root,
    env: { ...process.env, HOME: env.home, PATH: env.path },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  assert.deepEqual(blockDirs(p), ['cache', 'request-guard'])
  const pkg = JSON.parse(readFileSync(join(p, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
  assert.equal(pkg.scripts.test, 'echo host-test')
  assert.match(pkg.scripts['substrate:test'], /cache\/block\.test\.ts/)
  assert.match(pkg.scripts['substrate:test'], /request-guard\/block\.test\.ts/)
})

console.log('')
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
