// adapters/memory.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: an in-process Map of buffers. Real enough to
// build and test against; every object vanishes on restart, so it tops out at `nursery`.
// It still computes the sha256 etag and honors read-time expiry — those are PORT guarantees,
// not graduated luxuries. url() returns a memory:// locator: a link only this process can
// dereference, which is exactly as far as a nursery store should pretend to reach.

import { createHash } from 'node:crypto'
import type { Adapter, BlobStore, ObjectStat, PutOptions, UrlOptions } from '../port.ts'
import { assertValidKey } from '../port.ts'

interface Entry {
  bytes: Uint8Array
  stat: ObjectStat
  expiresAt: number | null
}

class MemoryBlobStore implements BlobStore {
  private namespace: string
  private objects = new Map<string, Entry>()

  constructor(namespace: string) {
    this.namespace = namespace
  }

  // Expiry is enforced at read time at every grade; here the lazy reclaim is a map delete.
  private live(key: string): Entry | null {
    const e = this.objects.get(key)
    if (!e) return null
    if (e.expiresAt !== null && Date.now() >= e.expiresAt) {
      this.objects.delete(key)
      return null
    }
    return e
  }

  async put(key: string, bytes: Uint8Array, opts: PutOptions = {}): Promise<ObjectStat> {
    assertValidKey(key)
    const stat: ObjectStat = {
      key,
      size: bytes.byteLength,
      etag: createHash('sha256').update(bytes).digest('hex'),
      contentType: opts.contentType ?? 'application/octet-stream',
    }
    this.objects.set(key, { bytes: bytes.slice(), stat, expiresAt: opts.expiresInMs ? Date.now() + opts.expiresInMs : null })
    return stat
  }
  async get(key: string): Promise<Uint8Array | null> {
    return this.live(key)?.bytes.slice() ?? null
  }
  async del(key: string): Promise<boolean> {
    const had = this.live(key) !== null
    this.objects.delete(key)
    return had
  }
  async list(prefix = ''): Promise<string[]> {
    const keys: string[] = []
    for (const k of [...this.objects.keys()]) if (this.live(k) !== null && k.startsWith(prefix)) keys.push(k)
    return keys.sort()
  }
  async stat(key: string): Promise<ObjectStat | null> {
    return this.live(key)?.stat ?? null
  }
  async url(key: string, _opts: UrlOptions = {}): Promise<string | null> {
    return this.live(key) !== null ? `memory://${this.namespace}/${key}` : null
  }
  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'memory',
  maxGrade: 'nursery',
  capabilities: ['content-hash'], // no atomic-put (nothing durable to tear), no urls/lifecycle guarantees
  async open(namespace: string): Promise<BlobStore> {
    return new MemoryBlobStore(namespace)
  },
}
