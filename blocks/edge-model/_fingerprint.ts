// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// MODEL_ADAPTER selects and prints a stable fingerprint of the observable result. Used by
// block.test.ts to assert port invariance across adapters. The transport, converter and
// inference are FAKE — canned bytes, the trivial header converter, and a deterministic digest
// stub — so this runs with zero network and zero real weights. The fingerprint excludes `ms`
// (wall time, not part of the deterministic contract) and the cache `path` (absolute, machine-
// specific); it keeps sha256, byte count, cache-hit flag, converted format, and run output.

import { open } from './index.ts'
import type { Inference, Transport } from './index.ts'

const CANNED = new TextEncoder().encode('pretend model weights v1')

const transport: Transport = async () => ({ status: 200, bytes: async () => CANNED })
// a deterministic stub that does NOT depend on the (changing, post-convert) artifact bytes, so
// every grade — convert or not — agrees on the run output for port-invariance.
const inference: Inference = async (_artifact, input) => `out:${input.prompt ?? ''}:${input.tokens ?? 0}`

const rt = await open({ transport, inference })

const ref = { source: 'url' as const, id: 'https://example.test/model.bin' }
const first = await rt.fetch(ref)
const second = await rt.fetch(ref) // same ref -> cache hit at every grade
await rt.convert(first.path, 'gguf') // a no-op at nursery (format stays raw), real above
const out = await rt.run({ prompt: 'hello', tokens: 8 })
const info = rt.info()
await rt.close()

process.stdout.write(
  JSON.stringify({
    sha256: first.sha256,
    bytes: first.bytes,
    firstCached: first.cached,
    secondCached: second.cached,
    output: out.output,
    loaded: info.loaded,
  }),
)
