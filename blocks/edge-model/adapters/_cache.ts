// adapters/_cache.ts — the shared machinery every grade reuses (like ai-model/_wire.ts).
//
// Three things live here so the three adapters stay thin and agree byte-for-byte on behavior:
//   • the content-addressed cache under .data/cache/ (write-temp + atomic rename, named by
//     sha256 of the bytes) — the port's "fetched once, never re-downloaded" guarantee;
//   • the default transport/converter/inference (dependency-free, deterministic) so tests run
//     with zero network and zero real weights, and production swaps any one of them out;
//   • ref resolution (url/file/hf -> a fetchable locator) and the digest helpers.
//
// Nothing here is the port; it is the implementation the adapters share. node:crypto is the
// only non-builtin-fs dependency, exactly as the brief allows.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Converter, Inference, ModelRef, RunInput, Transport } from '../port.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data', 'cache')

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

// blobPath: the content-addressed slot for a digest. Two equal payloads share one file.
function blobPath(digest: string): string {
  return join(DATA_DIR, `${digest}.bin`)
}

// writeContentAddressed: land bytes at their sha256 slot via write-temp + atomic rename, so a
// crash mid-download leaves an orphan temp file, never a torn artifact behind a valid digest.
// Returns the digest and the path. Idempotent: re-writing equal bytes is a no-op rename.
export async function writeContentAddressed(bytes: Uint8Array): Promise<{ digest: string; path: string }> {
  const digest = sha256(bytes)
  await mkdir(DATA_DIR, { recursive: true })
  const path = blobPath(digest)
  const tmp = `${path}.${randomUUID()}.tmp`
  await writeFile(tmp, bytes)
  await rename(tmp, path) // atomic on POSIX — the cache's durability guarantee
  return { digest, path }
}

// readBlob: the cached bytes for a digest, or null on a miss.
export async function readBlob(digest: string): Promise<Uint8Array | null> {
  try {
    return await readFile(blobPath(digest))
  } catch {
    return null
  }
}

export function cachePath(digest: string): string {
  return blobPath(digest)
}

// refKey: the stable cache key for a ref. Distinct refs that name the same source+id share a
// slot so a re-fetch of the same ref is a hit before the transport is ever consulted.
export function refKey(ref: ModelRef): string {
  return sha256(new TextEncoder().encode(`${ref.source}:${ref.id}`))
}

// resolveUrl: turn a ref into the locator the transport fetches. 'file' reads the local path
// directly (no transport); 'hf' becomes a resolve URL; 'url' is passed through. Dependency-free.
export function resolveUrl(ref: ModelRef): string {
  if (ref.source === 'url') return ref.id
  if (ref.source === 'file') return ref.id // handled by the caller before the transport
  // hf coordinate 'org/repo[:file]' -> a Hugging Face resolve URL
  const [repo, file = 'model.bin'] = ref.id.split(':')
  return `https://huggingface.co/${repo}/resolve/main/${file}`
}

// --- Defaults: dependency-free, deterministic, swappable ----------------------------------

// The default transport refuses to touch the network unless it is reading a local file:// or a
// real file path. A production caller passing nothing gets globalThis.fetch via the adapter;
// THIS default is the safety net for url/hf refs with no injected transport — it fails loudly
// rather than silently downloading, because real downloads belong to an explicit transport.
export const defaultTransport: Transport = async (url) => {
  if (url.startsWith('file://') || url.startsWith('/')) {
    const path = url.startsWith('file://') ? fileURLToPath(url) : url
    return { status: 200, bytes: async () => new Uint8Array(await readFile(path)) }
  }
  throw new Error(
    `edge-model: no transport injected for ${url} — pass opts.transport (fetch-shaped) for a real download; the default only reads local files`,
  )
}

// The default converter wraps the payload in a small format header. It is a REAL conversion
// (the bytes change, the format is recorded) but trivial; a gguf/onnx converter swaps in here.
// Idempotent by construction: re-wrapping an already-wrapped payload detects the header and
// returns it unchanged, so convert-twice == convert-once.
const HEADER_PREFIX = 'EDGEFMT:'

export function formatHeader(toFormat: string): Uint8Array {
  return new TextEncoder().encode(`${HEADER_PREFIX}${toFormat}\n`)
}

export function readFormat(bytes: Uint8Array): string | null {
  const head = new TextDecoder().decode(bytes.slice(0, 64))
  if (!head.startsWith(HEADER_PREFIX)) return null
  const nl = head.indexOf('\n')
  return nl === -1 ? null : head.slice(HEADER_PREFIX.length, nl)
}

export const defaultConverter: Converter = async (bytes, toFormat) => {
  if (readFormat(bytes) === toFormat) return bytes // idempotent: already in this format
  const header = formatHeader(toFormat)
  const out = new Uint8Array(header.length + bytes.length)
  out.set(header, 0)
  out.set(bytes, header.length)
  return out
}

// The default inference is a deterministic digest of the artifact + the input, so run() is
// reproducible with no real weights — a stable fingerprint across adapters and processes. A
// real llama/onnx runtime swaps in here and the port does not change.
export const defaultInference: Inference = async (artifact, input) => {
  const seed = `${sha256(artifact)}|${input.prompt ?? ''}|${input.tokens ?? 0}`
  const digest = createHash('sha256').update(seed).digest('hex')
  const tokens = Math.max(1, Math.min(input.tokens ?? 8, 32))
  return `edge:${digest.slice(0, tokens)}`
}
