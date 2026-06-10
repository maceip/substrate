// port.ts — THE PORT for edge-model. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping HF-download + gguf-convert + llama-run for a managed local runtime must
// pass through here and change NOTHING above it. This is the LOCAL/EDGE artifact lifecycle —
// acquire -> convert -> run a model on this machine — and it is DISTINCT from ai-model, which
// is a CLOUD provider seam (Anthropic/OpenAI over the network). The ladder this block walks:
// fetch+cache from a url/file ref -> + format conversion + checksum verification -> + a warm
// pool (load once, reuse) and multi-format.
//
// The TEST SEAM is part of the port: open() accepts an injectable fetch-shaped transport
// (global fetch is the default) AND an injectable converter + inference fn, so invariance
// tests run with canned bytes and a stub model — zero network, zero real weights — while
// production passes nothing and gets the real download + runtime.
//
// PORT GUARANTEES (every grade upholds these — they are the contract, not adapter niceties):
//   • CONTENT-ADDRESSED CACHE. fetch(ref) stores the artifact under its sha256; re-fetching
//     the SAME ref is a cache HIT that returns the cached path without re-downloading (the
//     transport is not called again). The reported sha256 is the sha256 of the bytes.
//   • CONVERT IS IDEMPOTENT. convert(path, fmt) on an already-converted artifact returns the
//     same output path/format — converting twice is converting once.
//   • RUN IS DETERMINISTIC under the test runtime. The same input yields the same output, so
//     a fingerprint over fetch->convert->run is stable across adapters and across processes.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// ModelRef: where an artifact comes from. 'url' and 'file' are dependency-free at every grade;
// 'hf' is a Hugging Face repo coordinate the adapter resolves to a download URL. The ref is the
// cache key: two fetches of an equal ref hit the same content-addressed slot.
export interface ModelRef {
  source: 'url' | 'hf' | 'file'
  id: string // a URL, an absolute file path, or an 'org/repo[:file]' HF coordinate
}

// FetchResult: what fetch() reports about the acquired artifact. `path` is inside the block's
// content-addressed cache (.data/), `sha256` is the hex digest of the bytes — the integrity
// hook every grade exposes so a corrupted artifact is detectable on load.
export interface FetchResult {
  path: string
  bytes: number
  sha256: string
  cached: boolean // true when this ref was already in the cache (no transport call happened)
}

// ConvertResult: where the converted artifact landed and what format it is now in. Idempotent:
// converting an already-converted artifact returns the same path + format.
export interface ConvertResult {
  path: string
  format: string
}

export interface RunInput {
  prompt?: string
  tokens?: number // soft cap on generated length; the stub runtime honors it deterministically
}

export interface RunResult {
  output: string
  ms: number // wall time the run took; not part of the deterministic fingerprint
}

// Info: what the runtime can tell you about itself right now. `loaded` reflects the warm pool —
// at graduated a model loaded once stays loaded across run() calls; below it, false.
export interface RuntimeInfo {
  format?: string // the format the loaded artifact is in, once converted/loaded
  loaded: boolean
}

// Transport: the injectable seam for acquiring bytes. Shaped like fetch so `globalThis.fetch`
// IS a Transport; a test passes a function returning canned bytes instead. Resolving an 'hf'
// or 'file' ref to a fetchable URL is the adapter's job; the transport only moves bytes.
export interface TransportResponse {
  status: number
  bytes(): Promise<Uint8Array>
}
export type Transport = (url: string) => Promise<TransportResponse>

// Converter: the injectable format step. Given the raw bytes and a target format, it returns
// the converted bytes. Adapters ship a trivial real converter (a format header wrapping the
// payload) and accept an injected one — so a heavyweight gguf/onnx converter swaps in without
// touching the port or app code.
export type Converter = (bytes: Uint8Array, toFormat: string) => Promise<Uint8Array>

// Inference: the injectable run step. Given the loaded artifact bytes and an input, it returns
// the output text. The default is a deterministic stub (a digest of bytes+input) so run() is
// reproducible with no real weights; a real llama/onnx runtime swaps in here.
export type Inference = (artifact: Uint8Array, input: RunInput) => Promise<string>

export interface OpenOptions {
  transport?: Transport // default: globalThis.fetch (the real download)
  converter?: Converter // default: the adapter's trivial header-wrapping converter
  inference?: Inference // default: the deterministic digest stub
}

// ModelRuntime: the contract. Every adapter, at every grade, satisfies exactly this.
export interface ModelRuntime {
  fetch(ref: ModelRef): Promise<FetchResult>
  convert(path: string, toFormat: string): Promise<ConvertResult>
  run(input: RunInput): Promise<RunResult>
  info(): RuntimeInfo
  close(): Promise<void>
}

// Adapter: what each adapter file exports. The port is the SHAPE (ModelRuntime); the adapter is
// the swappable thing behind it. `maxGrade` is the highest grade whose requirements this adapter
// can satisfy; `capabilities` are the named guarantees the gate evaluator checks against.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(opts?: OpenOptions): Promise<ModelRuntime>
}
