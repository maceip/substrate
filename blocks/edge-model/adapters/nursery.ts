// adapters/nursery.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: fetch+cache a url/file artifact through the
// injectable transport into the content-addressed cache, and run it through the injectable
// inference stub. It does NOT convert (convert() returns the artifact untouched, no format),
// and it does NOT verify the checksum on cache load — it trusts the slot. That trust is fine
// for the first five minutes and for tests, but the moment the artifact matters in production
// the gate fires (checksum-verified + content-addressed-cache become mandatory), so this tops
// out at `nursery`. The cache itself IS content-addressed here too; what nursery lacks is the
// load-time verification and the conversion step the higher grades add.

import { readFile } from 'node:fs/promises'
import type { Adapter, ConvertResult, FetchResult, ModelRef, ModelRuntime, OpenOptions, RunInput, RunResult, RuntimeInfo, Transport } from '../port.ts'
import { cachePath, defaultInference, defaultTransport, readBlob, refKey, resolveUrl, sha256, writeContentAddressed } from './_cache.ts'
import type { Converter, Inference } from '../port.ts'

class NurseryRuntime implements ModelRuntime {
  private transport: Transport
  private inference: Inference
  private refToDigest = new Map<string, string>() // ref key -> sha256, the in-process cache index
  private loadedDigest: string | null = null

  constructor(transport: Transport, inference: Inference) {
    this.transport = transport
    this.inference = inference
  }

  async fetch(ref: ModelRef): Promise<FetchResult> {
    const key = refKey(ref)
    const known = this.refToDigest.get(key)
    if (known) {
      const bytes = await readBlob(known)
      if (bytes) return { path: cachePath(known), bytes: bytes.byteLength, sha256: known, cached: true }
    }
    // miss: pull the bytes (a local file ref reads directly; everything else via the transport)
    const bytes = ref.source === 'file' ? new Uint8Array(await readFile(ref.id)) : await this.pull(ref)
    const { digest, path } = await writeContentAddressed(bytes)
    this.refToDigest.set(key, digest)
    this.loadedDigest = digest
    return { path, bytes: bytes.byteLength, sha256: digest, cached: false }
  }

  private async pull(ref: ModelRef): Promise<Uint8Array> {
    const res = await this.transport(resolveUrl(ref))
    if (res.status !== 200) throw new Error(`edge-model fetch: ${ref.source}:${ref.id} -> status ${res.status}`)
    return res.bytes()
  }

  // nursery does not convert: it hands the artifact back unchanged, format unknown.
  async convert(path: string, _toFormat: string): Promise<ConvertResult> {
    return { path, format: 'raw' }
  }

  async run(input: RunInput): Promise<RunResult> {
    if (!this.loadedDigest) throw new Error('edge-model run: nothing fetched yet — call fetch() first')
    const bytes = await readBlob(this.loadedDigest)
    if (!bytes) throw new Error('edge-model run: cached artifact vanished from the cache')
    const start = performance.now()
    const output = await this.inference(bytes, input)
    return { output, ms: performance.now() - start }
  }

  info(): RuntimeInfo {
    return { loaded: this.loadedDigest !== null } // no warm pool — `loaded` just means fetched
  }
  async close(): Promise<void> {
    this.loadedDigest = null
    this.refToDigest.clear()
  }
}

export const adapter: Adapter = {
  name: 'nursery',
  maxGrade: 'nursery',
  capabilities: ['content-addressed-cache'], // no checksum-on-load, no convert, no warm pool
  async open(opts: OpenOptions = {}): Promise<ModelRuntime> {
    const transport: Transport = opts.transport ?? defaultTransport
    const inference: Inference = opts.inference ?? defaultInference
    // converter is accepted but unused at nursery — kept in the signature so the seam exists
    const _converter: Converter | undefined = opts.converter
    void _converter
    return new NurseryRuntime(transport, inference)
  },
}
