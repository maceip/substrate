// adapters/object.ts — GRADUATED grade
//
// The heaviest dependency-free approximation of object storage. Each namespace lives under
// .data/objects/<ns>/ with the object-storage shape: per object a .bin file AND a .meta.json
// sidecar (key, etag, contentType, expiry) — no central index, list() is an enumeration of
// sidecars, exactly how a bucket behaves. url() returns an expiring HMAC-signed token URL
// (node:crypto, secret persisted beside the data so every process on the host signs and
// verifies identically): a leaked link goes dead at its exp instead of living forever. A
// lifecycle sweep runs on demand (open and list) and physically reclaims every expired pair.
//
// The REAL graduated step is S3/R2/GCS + presigned URLs + bucket lifecycle policies (the
// catalog ladder). This adapter holds the same port and the same capability names
// ('expiring-urls', 'shared-backend', 'lifecycle-policy'), so the gate evaluator and the
// app cannot tell the difference, and the swap to S3 is one adapter file.

import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, BlobStore, ObjectStat, PutOptions, UrlOptions } from '../port.ts'
import { assertValidKey } from '../port.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data', 'objects')
const DEFAULT_URL_TTL_MS = 15 * 60_000 // presigned-URL convention: short-lived by default

interface Meta {
  key: string
  size: number
  etag: string
  contentType: string
  expiresAt: number | null
}

// The signing secret lives beside the data ('wx' so exactly one process creates it) — every
// instance reading this store signs and verifies the same tokens, the shared-backend half
// of signed URLs. Behind real S3 this is the credential the SDK already holds.
async function loadSecret(): Promise<string> {
  const path = join(DATA_DIR, '.url-secret')
  await mkdir(DATA_DIR, { recursive: true })
  try {
    await writeFile(path, randomBytes(32).toString('hex'), { flag: 'wx' })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
  }
  return (await readFile(path, 'utf8')).trim()
}

class ObjectBlobStore implements BlobStore {
  private namespace: string
  private dir: string
  private secret: string

  constructor(namespace: string, secret: string) {
    this.namespace = namespace
    this.dir = join(DATA_DIR, namespace.replace(/[^a-z0-9_-]/gi, '_'))
    this.secret = secret
  }

  private name(key: string): string {
    return createHash('sha256').update(key).digest('hex').slice(0, 32)
  }
  private binPath(key: string): string {
    return join(this.dir, `${this.name(key)}.bin`)
  }
  private metaPath(key: string): string {
    return join(this.dir, `${this.name(key)}.meta.json`)
  }

  private async readMeta(path: string): Promise<Meta | null> {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as Meta
    } catch {
      return null // missing or torn sidecar == the object is not visible
    }
  }

  // Expiry is enforced at read time at every grade; the expired pair is reclaimed in place.
  private async liveMeta(key: string): Promise<Meta | null> {
    const m = await this.readMeta(this.metaPath(key))
    if (!m) return null
    if (m.expiresAt !== null && Date.now() >= m.expiresAt) {
      await this.reclaim(key)
      return null
    }
    return m
  }

  private async reclaim(key: string): Promise<void> {
    await rm(this.metaPath(key), { force: true }) // sidecar first: the key vanishes before the bytes
    await rm(this.binPath(key), { force: true })
  }

  // The lifecycle sweep — what the 'lifecycle-policy' capability names. Runs on demand
  // (open and list) and physically frees every expired object, not just the one being read.
  async sweep(): Promise<number> {
    let names: string[]
    try {
      names = (await readdir(this.dir)).filter((n) => n.endsWith('.meta.json'))
    } catch {
      return 0
    }
    let reclaimed = 0
    for (const n of names) {
      const m = await this.readMeta(join(this.dir, n))
      if (m && m.expiresAt !== null && Date.now() >= m.expiresAt) {
        await this.reclaim(m.key)
        reclaimed++
      }
    }
    return reclaimed
  }

  async put(key: string, bytes: Uint8Array, opts: PutOptions = {}): Promise<ObjectStat> {
    assertValidKey(key)
    await mkdir(this.dir, { recursive: true })
    const meta: Meta = {
      key,
      size: bytes.byteLength,
      etag: createHash('sha256').update(bytes).digest('hex'),
      contentType: opts.contentType ?? 'application/octet-stream',
      expiresAt: opts.expiresInMs ? Date.now() + opts.expiresInMs : null,
    }
    // Bytes land before the sidecar: a crash between the two leaves an orphan .bin (swept
    // up by a later put to the same key), never a visible key with torn bytes.
    const tmpBin = `${this.binPath(key)}.${randomUUID()}.tmp`
    await writeFile(tmpBin, bytes)
    await rename(tmpBin, this.binPath(key))
    const tmpMeta = `${this.metaPath(key)}.${randomUUID()}.tmp`
    await writeFile(tmpMeta, JSON.stringify(meta, null, 2))
    await rename(tmpMeta, this.metaPath(key))
    return { key, size: meta.size, etag: meta.etag, contentType: meta.contentType }
  }
  async get(key: string): Promise<Uint8Array | null> {
    if ((await this.liveMeta(key)) === null) return null
    try {
      return await readFile(this.binPath(key))
    } catch {
      return null // raced with a concurrent del — a miss, not an error
    }
  }
  async del(key: string): Promise<boolean> {
    const had = (await this.liveMeta(key)) !== null
    if (!had) return false
    await this.reclaim(key)
    return true
  }
  async list(prefix = ''): Promise<string[]> {
    await this.sweep() // lifecycle on demand: an enumeration never reports reclaimed objects
    let names: string[]
    try {
      names = (await readdir(this.dir)).filter((n) => n.endsWith('.meta.json'))
    } catch {
      return []
    }
    const keys: string[] = []
    for (const n of names) {
      const m = await this.readMeta(join(this.dir, n))
      if (m && m.key.startsWith(prefix)) keys.push(m.key)
    }
    return keys.sort()
  }
  async stat(key: string): Promise<ObjectStat | null> {
    const m = await this.liveMeta(key)
    return m ? { key, size: m.size, etag: m.etag, contentType: m.contentType } : null
  }
  // The signed-URL seam, graduated: an exp timestamp plus an HMAC over namespace/key/exp.
  // Anyone holding the secret verifies sig before serving; past exp the token is dead no
  // matter who holds it. Shaped exactly like a presigned S3/R2/GCS URL.
  async url(key: string, opts: UrlOptions = {}): Promise<string | null> {
    if ((await this.liveMeta(key)) === null) return null
    const exp = Date.now() + (opts.expiresInMs ?? DEFAULT_URL_TTL_MS)
    const sig = createHmac('sha256', this.secret).update(`${this.namespace}/${key}:${exp}`).digest('hex')
    const path = key.split('/').map(encodeURIComponent).join('/')
    return `blob://${this.namespace}/${path}?exp=${exp}&sig=${sig}`
  }
  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'object',
  maxGrade: 'graduated',
  capabilities: ['content-hash', 'atomic-put', 'expiring-urls', 'shared-backend', 'lifecycle-policy'],
  async open(namespace: string): Promise<BlobStore> {
    const store = new ObjectBlobStore(namespace, await loadSecret())
    await store.sweep() // lifecycle on demand: opening a namespace reclaims what expired since
    return store
  },
}
