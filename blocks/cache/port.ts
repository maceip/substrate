// port.ts — THE PORT for cache. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping the cache engine (in-process map -> bounded LRU -> shared backend /
// Redis) must pass through here and change NOTHING above it. The catalog ladder this block
// implements (port-catalog-v0, `cache-ephemeral-state`): in-memory TTL cache behind a
// get/set interface -> Redis/Memcached, distributed locks, stampede protection.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// Cache<T>: the contract. Every adapter, at every grade, satisfies exactly this.
// TTL is part of the PORT, not the adapter: an entry past its ttlMs is never returned,
// whether or not the engine has physically evicted it yet. getOrFill is the stampede seam:
// app code states how a miss is computed ONCE; whether concurrent misses coalesce is the
// adapter's business (the `single-flight` capability), never the app's.
export interface Cache<T> {
  get(key: string): Promise<T | undefined>
  set(key: string, value: T, ttlMs?: number): Promise<void>
  del(key: string): Promise<boolean>
  getOrFill(key: string, fill: () => Promise<T>, ttlMs?: number): Promise<T>
  clear(): Promise<void>
  close(): Promise<void>
}

// Per-namespace policy. Adapters that cannot honor a knob simply lack the matching
// capability ('ttl', 'bounded') and the gate evaluator flags them.
export interface CacheOptions {
  defaultTtlMs?: number // applied when set/getOrFill omit ttlMs (default 60s)
  maxEntries?: number // bounded adapters evict beyond this (default 1024)
}

// Adapter: what each adapter file exports. The port is the SHAPE (Cache); the adapter is
// the swappable thing behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open<T>(namespace: string, opts?: CacheOptions): Promise<Cache<T>>
}
