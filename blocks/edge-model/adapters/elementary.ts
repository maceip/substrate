// adapters/elementary.ts — ELEMENTARY grade (the default)
//
// Everything nursery does, plus the two things the nursery->elementary gate activates:
//   • CHECKSUM-VERIFIED on load. Every read out of the content-addressed cache re-hashes the
//     bytes and asserts they match the slot's name. A corrupted or truncated artifact is
//     rejected loudly instead of being silently run — the failure mode that bites local model
//     work hardest (a half-downloaded gguf that "loads" and emits garbage).
//   • FORMAT-CONVERT. convert(path, fmt) runs the (injectable, trivial-by-default) converter,
//     re-lands the converted bytes in the content-addressed cache, and records the format.
//     Idempotent: converting an artifact already in the target format is a no-op.
// It still has no warm pool (each run reads from disk) and is single-format, so it tops out at
// elementary; the next gate adds those.

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

class ElementaryRuntime implements ModelRuntime {
  private transport: Transport
  private converter: Converter
  private inference: Inference
  private refToDigest = new Map<string, string>()
  private loadedDigest: string | null = null
  private loadedFormat: string | undefined

  constructor(transport: Transport, converter: Converter, inference: Inference) {
    this.transport = transport
    this.converter = converter
    this.inference = inference
  }

  // verifiedRead: read a slot AND re-hash it — the checksum-verified guarantee. A slot whose
  // bytes no longer hash to its name is a corrupted artifact and is rejected, not run.
  private async verifiedRead(digest: string): Promise<Uint8Array | null> {
    const bytes = await readBlob(digest)
    if (!bytes) return null
    const actual = sha256(bytes)
    if (actual !== digest) throw new Error(`edge-model: cached artifact ${digest.slice(0, 12)}… is corrupted (checksum ${actual.slice(0, 12)}… mismatch) — rejected`)
    return bytes
  }

  async fetch(ref: ModelRef): Promise<FetchResult> {
    const key = refKey(ref)
    const known = this.refToDigest.get(key)
    if (known) {
      const bytes = await this.verifiedRead(known) // hit path is checksum-verified too
      if (bytes) return { path: cachePath(known), bytes: bytes.byteLength, sha256: known, cached: true }
    }
    const bytes = ref.source === 'file' ? new Uint8Array(await readFile(ref.id)) : await this.pull(ref)
    const { digest, path } = await writeContentAddressed(bytes)
    this.refToDigest.set(key, digest)
    this.loadedDigest = digest
    this.loadedFormat = readFormat(bytes) ?? undefined
    return { path, bytes: bytes.byteLength, sha256: digest, cached: false }
  }

  private async pull(ref: ModelRef): Promise<Uint8Array> {
    const res = await this.transport(resolveUrl(ref))
    if (res.status !== 200) throw new Error(`edge-model fetch: ${ref.source}:${ref.id} -> status ${res.status}`)
    return res.bytes()
  }

  async convert(_path: string, toFormat: string): Promise<ConvertResult> {
    if (!this.loadedDigest) throw new Error('edge-model convert: nothing fetched yet — call fetch() first')
    const source = await this.verifiedRead(this.loadedDigest)
    if (!source) throw new Error('edge-model convert: source artifact missing from the cache')
    if (readFormat(source) === toFormat) {
      // idempotent: already in the target format — no re-conversion, same slot
      this.loadedFormat = toFormat
      return { path: cachePath(this.loadedDigest), format: toFormat }
    }
    const converted = await this.converter(source, toFormat)
    const { digest, path } = await writeContentAddressed(converted)
    this.loadedDigest = digest
    this.loadedFormat = toFormat
    return { path, format: toFormat }
  }

  async run(input: RunInput): Promise<RunResult> {
    if (!this.loadedDigest) throw new Error('edge-model run: nothing fetched yet — call fetch() first')
    const bytes = await this.verifiedRead(this.loadedDigest)
    if (!bytes) throw new Error('edge-model run: cached artifact vanished from the cache')
    const start = performance.now()
    const output = await this.inference(bytes, input)
    return { output, ms: performance.now() - start }
  }

  info(): RuntimeInfo {
    return { format: this.loadedFormat, loaded: this.loadedDigest !== null }
  }
  async close(): Promise<void> {
    this.loadedDigest = null
    this.loadedFormat = undefined
    this.refToDigest.clear()
  }
}

export const adapter: Adapter = {
  name: 'elementary',
  maxGrade: 'elementary',
  capabilities: ['content-addressed-cache', 'checksum-verified', 'format-convert'], // no warm pool
  async open(opts: OpenOptions = {}): Promise<ModelRuntime> {
    return new ElementaryRuntime(opts.transport ?? defaultTransport, opts.converter ?? defaultConverter, opts.inference ?? defaultInference)
  },
}
