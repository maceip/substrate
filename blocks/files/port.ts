// port.ts — THE PORT for files. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping the blob engine (in-memory map -> local filesystem -> S3/R2/GCS) must
// pass through here and change NOTHING above it. The catalog ladder this block implements
// (port-catalog-v0, `files-artifacts-storage`): local filesystem/blob adapter -> S3/R2/GCS,
// signed URLs, lifecycle policies.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// Keys are namespaced paths ('avatars/u1/profile.png') — the object-storage convention. The
// key IS the contract: adapters may lay bytes out however they like, but the key the app
// wrote with is the key every grade reads with. This guard is shared by all adapters so no
// grade quietly accepts a key another grade would reject.
export function assertValidKey(key: string): void {
  if (key.length === 0 || key.length > 1024) throw new Error(`invalid key ${JSON.stringify(key)}: empty or longer than 1024`)
  if (key.includes('\\') || key.includes('\u0000')) throw new Error(`invalid key ${JSON.stringify(key)}: backslash or NUL`)
  if (key.split('/').some((seg) => seg === '' || seg === '.' || seg === '..'))
    throw new Error(`invalid key ${JSON.stringify(key)}: empty or dot path segment`)
}

// What put/stat report about a stored object. `etag` is the sha256 of the bytes — content
// hashing is a PORT guarantee, not an adapter nicety: every grade reports the same etag for
// the same bytes, so integrity checks and dedup have a stable hook.
export interface ObjectStat {
  key: string
  size: number
  etag: string // sha256 hex of the bytes
  contentType: string // defaults to application/octet-stream
}

export interface PutOptions {
  contentType?: string
  // Expiry is a port guarantee at READ time: an object past its expiry is never served by
  // get/stat/list, at any grade. PHYSICAL reclamation (a sweep that frees the storage) is
  // the 'lifecycle-policy' capability — what the graduated gate checks for.
  expiresInMs?: number
}

export interface UrlOptions {
  expiresInMs?: number // validity window — honored by adapters with 'expiring-urls'
}

// BlobStore: the contract. Every adapter, at every grade, satisfies exactly this.
// url() is the signed-URL seam: app code asks the PORT for a download link and hands it on.
// At nursery it is a local locator (memory:// or file://); at graduated it carries a signed
// expiry; behind S3 it becomes a presigned URL — and no call site changes either way.
export interface BlobStore {
  put(key: string, bytes: Uint8Array, opts?: PutOptions): Promise<ObjectStat>
  get(key: string): Promise<Uint8Array | null>
  del(key: string): Promise<boolean>
  list(prefix?: string): Promise<string[]> // live keys under prefix, sorted
  stat(key: string): Promise<ObjectStat | null>
  url(key: string, opts?: UrlOptions): Promise<string | null> // null when the object is absent
  close(): Promise<void>
}

// Adapter: what each adapter file exports. The port is the SHAPE (BlobStore); the adapter is
// the swappable thing behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(namespace: string): Promise<BlobStore>
}
