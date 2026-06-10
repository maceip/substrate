// block.test.ts — invariants of the ai-model block. Dependency-free; run with node.
//   node ai-model/block.test.ts
//
// Proves the claims the block exists to make — with a FAKE transport throughout, so the
// whole file runs with zero network and zero API keys (the apiKey strings below are
// placeholders for the fake wire, not key material):
//   1. The port holds: the same app sequence yields the same result under every adapter.
//   2. Elementary retries transient failures; nursery does not; graduated falls back.
//   3. The protected evaluator refuses loosening.

import assert from 'node:assert/strict'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { adapter as nursery } from './adapters/anthropic.ts'
import { adapter as resilient } from './adapters/resilient.ts'
import { adapter as graduated } from './adapters/multi-provider.ts'
import type { Transport, TransportResponse } from './port.ts'

let failures = 0
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((e) => {
      failures++
      console.log(`  ✗ ${name}\n      ${e.message}`)
    })
}

const PLACEHOLDER_KEY = 'placeholder-not-a-key'
const canned = (status: number, body: unknown): TransportResponse => ({ status, text: async () => JSON.stringify(body) })

const OK_ANTHROPIC = {
  content: [{ type: 'text', text: 'pong' }],
  model: 'claude-opus-4-8',
  stop_reason: 'end_turn',
  usage: { input_tokens: 12, output_tokens: 3 },
}
const OK_OPENAI = {
  choices: [{ message: { content: 'pong-from-fallback' }, finish_reason: 'stop' }],
  model: 'fallback-model',
  usage: { prompt_tokens: 12, completion_tokens: 3 },
}
const ERR = (type: string, message: string) => ({ type: 'error', error: { type, message } })
const PING = { messages: [{ role: 'user' as const, content: 'ping' }], maxTokens: 32 }

console.log('\nai-model block invariants:')

// 1. Port invariance: the same app sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
//    The fingerprint's transport is fake — no network, no keys, deterministic responses.
await check('port invariance: anthropic, resilient and multi-provider agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, AI_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  const anthropic = run('anthropic')
  assert.equal(anthropic, run('resilient'), 'anthropic and resilient diverged')
  assert.equal(anthropic, run('multi-provider'), 'anthropic and multi-provider diverged')
})

// 2a. Elementary retries a transient failure: one canned 429, then success.
await check('retry: elementary retries a canned 429 then succeeds', async () => {
  let calls = 0
  const transport: Transport = async () => {
    calls++
    return calls === 1 ? canned(429, ERR('rate_limit_error', 'slow down')) : canned(200, OK_ANTHROPIC)
  }
  const c = await resilient.open({ transport, apiKey: PLACEHOLDER_KEY, retryBaseMs: 1 })
  const out = await c.complete(PING)
  assert.equal(out.text, 'pong')
  assert.equal(calls, 2, `expected 2 attempts, transport saw ${calls}`)
  await c.close()
})

// 2b. Nursery makes exactly one attempt: the 429 surfaces, nothing retries.
await check('retry: nursery does not retry — a canned 429 surfaces on the first attempt', async () => {
  let calls = 0
  const transport: Transport = async () => {
    calls++
    return canned(429, ERR('rate_limit_error', 'slow down'))
  }
  const c = await nursery.open({ transport, apiKey: PLACEHOLDER_KEY })
  await assert.rejects(() => c.complete(PING), /429 rate_limit_error/)
  assert.equal(calls, 1, `expected 1 attempt, transport saw ${calls}`)
  await c.close()
})

// 2c. Graduated falls back: anthropic answers 529 overloaded (every attempt), so the
//     ordered fallback routes to the OpenAI-compatible provider — and usage is attributed
//     to the provider that actually answered.
await check('fallback: graduated falls back to provider 2 on a canned 529 overloaded', async () => {
  let anthropicCalls = 0
  let fallbackCalls = 0
  const transport: Transport = async (url) => {
    if (url.includes('api.anthropic.com')) {
      anthropicCalls++
      return canned(529, ERR('overloaded_error', 'overloaded'))
    }
    fallbackCalls++
    return canned(200, OK_OPENAI)
  }
  const c = await graduated.open({
    transport,
    apiKey: PLACEHOLDER_KEY,
    maxRetries: 1,
    retryBaseMs: 1,
    fallback: { baseUrl: 'https://fallback.example/v1', apiKey: PLACEHOLDER_KEY, model: 'fallback-model' },
  })
  const out = await c.complete(PING)
  assert.equal(out.text, 'pong-from-fallback')
  assert.equal(out.model, 'fallback-model')
  assert.equal(out.stopReason, 'end_turn') // finish_reason normalized to the port vocabulary
  assert.equal(anthropicCalls, 2, 'provider 1 should get 1 attempt + 1 retry before falling over')
  assert.equal(fallbackCalls, 1)
  assert.equal(c.usage()['openai-compatible']?.calls, 1, 'usage must attribute to the provider that answered')
  await c.close()
})

// 2d. The error TYPE picks the policy: a 400 invalid_request is the caller's bug — no
//     retry, no fallback; every provider would reject the same broken request.
await check('fallback: a canned 400 invalid_request does NOT retry or fall back', async () => {
  let anthropicCalls = 0
  let fallbackCalls = 0
  const transport: Transport = async (url) => {
    if (url.includes('api.anthropic.com')) {
      anthropicCalls++
      return canned(400, ERR('invalid_request_error', 'max_tokens must be positive'))
    }
    fallbackCalls++
    return canned(200, OK_OPENAI)
  }
  const c = await graduated.open({
    transport,
    apiKey: PLACEHOLDER_KEY,
    retryBaseMs: 1,
    fallback: { baseUrl: 'https://fallback.example/v1', apiKey: PLACEHOLDER_KEY, model: 'fallback-model' },
  })
  await assert.rejects(() => c.complete(PING), /400 invalid_request_error/)
  assert.equal(anthropicCalls, 1, 'invalid request must not be retried')
  assert.equal(fallbackCalls, 0, 'invalid request must not fall back')
  await c.close()
})

// 2e. The key is required at call time, with a clear error naming the env var.
await check('nursery: a clear error without ANTHROPIC_API_KEY at call time', async () => {
  const saved = process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  try {
    const c = await nursery.open({ transport: async () => canned(200, OK_ANTHROPIC) })
    await assert.rejects(() => c.complete(PING), /ANTHROPIC_API_KEY is not set/)
    await c.close()
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved
  }
})

// 3. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { prod: false, callsPerDay: 20, costSensitive: false, multiModel: false } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { prod: true, callsPerDay: 20, costSensitive: false, multiModel: false } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { prod: true, callsPerDay: 50_000, costSensitive: true, multiModel: true } }).requiredGrade, 'graduated')
})

// 4. AEvo: loosening is rejected; tightening is allowed.
await check('assertNoLoosening: removing a gate is a violation', () => {
  const loosened = GATES.slice(0, 1) // dropped the graduated gate
  assert.ok(assertNoLoosening(GATES, loosened).length > 0)
})
await check('assertNoLoosening: adding a gate is allowed (tightening)', () => {
  const tightened = [...GATES, { ...GATES[0], id: 'gate:extra' }]
  assert.equal(assertNoLoosening(GATES, tightened).length, 0)
})

// AEvo armed: the live gates may not loosen the baseline committed at git HEAD
// (block.json). Tightening passes; loosening fails until a human commits it.
await check('PROTECTED: live gates do not loosen the committed baseline', async () => {
  const { checkProtection } = await import('../_kernel/protect.ts')
  const res = checkProtection(new URL('.', import.meta.url).pathname, GATES)
  if (res.baseline === 'none') return console.log('      (no committed baseline yet — protection arms on first commit)')
  assert.deepEqual(res.violations, [])
})

console.log('')
if (failures > 0) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
