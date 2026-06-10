// adapters/fs.ts — ELEMENTARY grade (the nursery DEFAULT for real projects)
//
// Durable, dependency-free, single-process. Each namespace lives under .data/fs/<ns>/:
// bytes as one .bin file per object (named by a hash of the key, so any valid key maps to
// a safe filename) plus one index.json carrying key -> metadata. Both the blob and the
// index land via write-temp + atomic rename — a crash mid-upload leaves an orphan temp
// file, never a torn object behind a valid key. That earns `atomic-put`, which together
// with the sha256 etag satisfies everything the nursery->elementary gate activates.
// url() is a file:// URL: real enough to open locally, and the seam where a presigned
// S3 URL appears later without any call site changing.

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Adapter, BlobStore, ObjectStat, PutOptions, UrlOptions } from '../port.ts'
import { assertValidKey } from '../port.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data', 'fs')

interface Meta {
  size: number
  etag: string
  contentType: string
  expiresAt: number | null
}

type Index = Record<string, Meta> // key -> metadata; the blob file name derives from the key

class FsBlobStore implements BlobStore {
  private dir: string
  private indexPath: string
  private cache: Index | null = null

  constructor(namespace: string) {
    this.dir = join(DATA_DIR, namespace.replace(/[^a-z0-9_-]/gi, '_'))
    this.indexPath = join(this.dir, 'index.json')
  }

  private blobPath(key: string): string {
    return join(this.dir, `${createHash('sha256').update(key).digest('hex').slice(0, 32)}.bin`)
  }

  private async load(): Promise<Index> {
    if (this.cache) return this.cache
    try {
      this.cache = JSON.parse(await readFile(this.indexPath, 'utf8')) as Index
    } catch {
      this.cache = {}
    }
    return this.cache
  }

  private async flush(index: Index): Promise<void> {
    await mkdir(this.dir, { recursive: true })
    const tmp = `${this.indexPath}.${randomUUID()}.tmp`
    await writeFile(tmp, JSON.stringify(index, null, 2))
    await rename(tmp, this.indexPath) // atomic on POSIX — the durability guarantee
  }

  // Expiry is enforced at read time at every grade; here the lazy reclaim removes the
  // blob file and the index entry for just the key being read.
  private async liveMeta(key: string): Promise<Meta | null> {
    const index = await this.load()
    const m = index[key]
    if (!m) return null
    if (m.expiresAt !== null && Date.now() >= m.expiresAt) {
      delete index[key]
      await rm(this.blobPath(key), { force: true })
      await this.flush(index)
      return null
    }
    return m
  }

  async put(key: string, bytes: Uint8Array, opts: PutOptions = {}): Promise<ObjectStat> {
    assertValidKey(key)
    await mkdir(this.dir, { recursive: true })
    const tmp = `${this.blobPath(key)}.${randomUUID()}.tmp`
    await writeFile(tmp, bytes)
    await rename(tmp, this.blobPath(key)) // the atomic-put guarantee
    const index = await this.load()
    index[key] = {
      size: bytes.byteLength,
      etag: createHash('sha256').update(bytes).digest('hex'),
      contentType: opts.contentType ?? 'application/octet-stream',
      expiresAt: opts.expiresInMs ? Date.now() + opts.expiresInMs : null,
    }
    await this.flush(index)
    return { key, size: index[key].size, etag: index[key].etag, contentType: index[key].contentType }
  }
  async get(key: string): Promise<Uint8Array | null> {
    if ((await this.liveMeta(key)) === null) return null
    try {
      return await readFile(this.blobPath(key))
    } catch {
      return null // index/blob raced with a concurrent del — a miss, not an error
    }
  }
  async del(key: string): Promise<boolean> {
    const had = (await this.liveMeta(key)) !== null
    if (!had) return false
    const index = await this.load()
    delete index[key]
    await rm(this.blobPath(key), { force: true })
    await this.flush(index)
    return true
  }
  async list(prefix = ''): Promise<string[]> {
    const index = await this.load()
    const keys: string[] = []
    for (const k of Object.keys(index)) if ((await this.liveMeta(k)) !== null && k.startsWith(prefix)) keys.push(k)
    return keys.sort()
  }
  async stat(key: string): Promise<ObjectStat | null> {
    const m = await this.liveMeta(key)
    return m ? { key, size: m.size, etag: m.etag, contentType: m.contentType } : null
  }
  async url(key: string, _opts: UrlOptions = {}): Promise<string | null> {
    return (await this.liveMeta(key)) !== null ? pathToFileURL(this.blobPath(key)).href : null
  }
  async close(): Promise<void> {
    this.cache = null
  }
}

export const adapter: Adapter = {
  name: 'fs',
  maxGrade: 'elementary',
  capabilities: ['content-hash', 'atomic-put'],
  async open(namespace: string): Promise<BlobStore> {
    return new FsBlobStore(namespace)
  },
}
