// adapters/graduated.ts — GRADUATED grade
//
// Everything elementary does, plus the two things the elementary->graduated gate activates:
//   • WARM POOL. The loaded artifact's bytes are held in memory after the first run() (or the
//     first convert), and every subsequent run() reuses them — no per-call re-read from disk.
//     info().loaded reflects the pool: false until the first load, true after, false again
//     after close(). This is the "warm pool beats reload-per-call" lesson made executable.
//   • MULTI-FORMAT. The runtime tracks a per-format slot map, so converting to gguf and then to
//     onnx keeps BOTH conversions cached and content-addressed; switching back to an already-
//     converted format is a warm hit, not a re-conversion. (capabilities advertises 'multi-
//     format' so the graduated gate's format reachability is satisfied.)
// The checksum-verified guarantee from elementary is preserved on every cold load into the pool.

import { readFile } from 'node:fs/promises'
import type { Adapter, ConvertResult, FetchResult, Inference, ModelRef, ModelRuntime, OpenOptions, RunInput, RunResult, RuntimeInfo, Transport } from '../port.ts'
import type { Converter } from '../port.ts'
import {
  cachePath,
  defaultConverter,
  defaultInference,
  defaultTransport,
  readBlob,
  readFormat,
  refKey,
  resolveUrl,
  sha256,
  writeContentAddressed,
} from './_cache.ts'

class GraduatedRuntime implements ModelRuntime {
  private transport: Transport
  private converter: Converter
  private inference: Inference
  private refToDigest = new Map<string, string>()
  private formatToDigest = new Map<string, string>() // multi-format: format -> slot digest
  private loadedDigest: string | null = null
  private loadedFormat: string | undefined
  private warm: { digest: string; bytes: Uint8Array } | null = null // the warm pool: load once, reuse

  constructor(transport: Transport, converter: Converter, inference: Inference) {
    this.transport = transport
    this.converter = converter
    this.inference = inference
  }

  // load: bring a slot into the warm pool, checksum-verified on the cold path. A digest already
  // warm is returned from memory with no disk read — the warm-pool guarantee.
  private async load(digest: string): Promise<Uint8Array> {
    if (this.warm && this.warm.digest === digest) return this.warm.bytes
    const bytes = await readBlob(digest)
    if (!bytes) throw new Error('edge-model: artifact missing from the cache')
    const actual = sha256(bytes)
    if (actual !== digest) throw new Error(`edge-model: cached artifact ${digest.slice(0, 12)}… is corrupted (checksum ${actual.slice(0, 12)}… mismatch) — rejected`)
    this.warm = { digest, bytes }
    return bytes
  }

  async fetch(ref: ModelRef): Promise<FetchResult> {
    const key = refKey(ref)
    const known = this.refToDigest.get(key)
    if (known) {
      const bytes = await this.load(known) // checksum-verified, and warms the pool
      return { path: cachePath(known), bytes: bytes.byteLength, sha256: known, cached: true }
    }
    const bytes = ref.source === 'file' ? new Uint8Array(await readFile(ref.id)) : await this.pull(ref)
    const { digest, path } = await writeContentAddressed(bytes)
    this.refToDigest.set(key, digest)
    this.loadedDigest = digest
    this.loadedFormat = readFormat(bytes) ?? undefined
    if (this.loadedFormat) this.formatToDigest.set(this.loadedFormat, digest)
    this.warm = { digest, bytes } // fetch warms the pool so the first run() is hot
    return { path, bytes: bytes.byteLength, sha256: digest, cached: false }
  }

  private async pull(ref: ModelRef): Promise<Uint8Array> {
    const res = await this.transport(resolveUrl(ref))
    if (res.status !== 200) throw new Error(`edge-model fetch: ${ref.source}:${ref.id} -> status ${res.status}`)
    return res.bytes()
  }

  async convert(_path: string, toFormat: string): Promise<ConvertResult> {
    if (!this.loadedDigest) throw new Error('edge-model convert: nothing fetched yet — call fetch() first')
    // multi-format: an already-converted format is a warm hit, not a re-conversion (idempotent)
    const cached = this.formatToDigest.get(toFormat)
    if (cached) {
      this.loadedDigest = cached
      this.loadedFormat = toFormat
      await this.load(cached)
      return { path: cachePath(cached), format: toFormat }
    }
    const source = await this.load(this.loadedDigest)
    if (readFormat(source) === toFormat) {
      this.loadedFormat = toFormat
      this.formatToDigest.set(toFormat, this.loadedDigest)
      return { path: cachePath(this.loadedDigest), format: toFormat }
    }
    const converted = await this.converter(source, toFormat)
    const { digest, path } = await writeContentAddressed(converted)
    this.loadedDigest = digest
    this.loadedFormat = toFormat
    this.formatToDigest.set(toFormat, digest)
    this.warm = { digest, bytes: converted } // the converted artifact is now the warm one
    return { path, format: toFormat }
  }

  async run(input: RunInput): Promise<RunResult> {
    if (!this.loadedDigest) throw new Error('edge-model run: nothing fetched yet — call fetch() first')
    const bytes = await this.load(this.loadedDigest) // warm: no disk read after the first
    const start = performance.now()
    const output = await this.inference(bytes, input)
    return { output, ms: performance.now() - start }
  }

  info(): RuntimeInfo {
    // `loaded` reflects the warm pool: true only once an artifact is actually held in memory.
    return { format: this.loadedFormat, loaded: this.warm !== null }
  }
  async close(): Promise<void> {
    this.warm = null
    this.loadedDigest = null
    this.loadedFormat = undefined
    this.refToDigest.clear()
    this.formatToDigest.clear()
  }
}

export const adapter: Adapter = {
  name: 'graduated',
  maxGrade: 'graduated',
  capabilities: ['content-addressed-cache', 'checksum-verified', 'format-convert', 'warm-pool', 'multi-format'],
  async open(opts: OpenOptions = {}): Promise<ModelRuntime> {
    return new GraduatedRuntime(opts.transport ?? defaultTransport, opts.converter ?? defaultConverter, opts.inference ?? defaultInference)
  },
}
