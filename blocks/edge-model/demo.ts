// demo.ts — a tiny local-inference app built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. It runs with ZERO network and no
// real weights: a FAKE fetch returns canned bytes and an injected inference fn stands in for a
// llama/onnx runtime. Run it under different MODEL_ADAPTER values and the app code is
// byte-for-byte identical — that is the port doing its job. It shows a cache miss then a cache
// HIT (the transport is called once), a format conversion, a prompted run, the adapter swap
// (same sequence fingerprinted under every grade), and the gate evaluator across the lifecycle.
//
//   node blocks/edge-model/demo.ts
//   MODEL_ADAPTER=nursery node blocks/edge-model/demo.ts
//   MODEL_ADAPTER=graduated node blocks/edge-model/demo.ts

import { rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { open, checkGrade, currentGrade } from './index.ts'
import type { Inference, Transport } from './index.ts'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '.data')
async function cleanup() {
  await rm(DATA, { recursive: true, force: true })
}
await cleanup() // start clean so the first fetch is a real miss across re-runs

// the test seam: canned bytes for a "model", and a deterministic stub for inference. A real
// download + llama runtime swap in by passing nothing here — the app code does not change.
const CANNED = new TextEncoder().encode('pretend GGUF weights for a tiny edge model')
let transportCalls = 0
const transport: Transport = async () => {
  transportCalls++
  return { status: 200, bytes: async () => CANNED }
}
const inference: Inference = async (_artifact, input) => `[stub] answered "${input.prompt}" in ${input.tokens ?? 8} tokens`

const grade = await currentGrade()
console.log(`\n=== edge-model block — adapter grade: ${grade} ===\n`)

const rt = await open({ transport, inference })
const ref = { source: 'hf' as const, id: 'tinyorg/tiny-edge-model:model.gguf' }

console.log('acquire (content-addressed cache):')
const miss = await rt.fetch(ref)
console.log(`  fetch ${ref.source}:${ref.id}`)
console.log(`    -> ${miss.bytes} bytes  sha256 ${miss.sha256.slice(0, 12)}…  cached:${miss.cached}  (transport calls: ${transportCalls})`)
const hit = await rt.fetch(ref) // SAME ref -> cache hit, transport NOT called again
console.log(`  fetch again (same ref)`)
console.log(`    -> cached:${hit.cached}  (transport calls still: ${transportCalls})  ${hit.sha256 === miss.sha256 ? 'same digest' : 'DIGEST CHANGED!'}`)

console.log('\nconvert (idempotent; no-op at nursery):')
const conv = await rt.convert(miss.path, 'gguf')
console.log(`  convert -> format:${conv.format}`)
const conv2 = await rt.convert(conv.path, 'gguf')
console.log(`  convert again (same format) -> format:${conv2.format}  (idempotent)`)

console.log('\nrun (deterministic under the stub runtime):')
const out = await rt.run({ prompt: 'what is an edge model?', tokens: 12 })
console.log(`  run -> ${out.output}  (${out.ms.toFixed(2)}ms)  info.loaded:${rt.info().loaded}`)
await rt.close()

// adapter swap: the SAME sequence, fingerprinted under every grade in a subprocess, with the
// same injected fakes — so the observable result is identical across grades.
const { execFileSync } = await import('node:child_process')
const fp = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, MODEL_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
console.log('\nadapter swap (identical observable fingerprint):')
for (const a of ['nursery', 'elementary', 'graduated']) console.log(`  ${a.padEnd(11)} ${fp(a)}`)

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (dev experiment, 20 calls/day)   ', await checkGrade({ prod: false, callsPerDay: 20, multiFormat: false, sharedCache: false })))
console.log(fmt('month 2 (prod inference)                 ', await checkGrade({ prod: true, callsPerDay: 2_000, multiFormat: false, sharedCache: false })))
console.log(fmt('month 9 (gguf+onnx, shared cache)        ', await checkGrade({ prod: true, callsPerDay: 50_000, multiFormat: true, sharedCache: true })))

await cleanup() // leave no .data behind
console.log('\n(zero network, no real weights — everything above ran on injected fakes)\n')
