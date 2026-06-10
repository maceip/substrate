// adapters/memory.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: a plain Map with TTL checked on read. An
// expired entry is never SERVED (the port's promise) but is only reclaimed when touched,
// the map is unbounded, and N concurrent misses run N fills. Fine for tests and the first
// five minutes; those three gaps are exactly what the nursery->elementary gate flags.

import type { Adapter, Cache, CacheOptions } from '../port.ts'

const DEFAULT_TTL_MS = 60_000

interface Entry<T> {
  value: T
  expiresAt: number
}

class MemoryCache<T> implements Cache<T> {
  private entries = new Map<string, Entry<T>>()
  private defaultTtlMs: number

  constructor(defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs
  }

  async get(key: string): Promise<T | undefined> {
    const e = this.entries.get(key)
    if (!e) return undefined
    if (Date.now() >= e.expiresAt) {
      this.entries.delete(key) // lazy reclaim — expiry only happens on read
      return undefined
    }
    return e.value
  }
  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) })
  }
  async del(key: string): Promise<boolean> {
    return this.entries.delete(key)
  }
  async getOrFill(key: string, fill: () => Promise<T>, ttlMs?: number): Promise<T> {
    const hit = await this.get(key)
    if (hit !== undefined) return hit
    const value = await fill() // no coalescing: concurrent misses each pay the fill
    await this.set(key, value, ttlMs)
    return value
  }
  async clear(): Promise<void> {
    this.entries.clear()
  }
  async close(): Promise<void> {
    this.entries.clear() // no timers to clear — expiry is read-time only
  }
}

export const adapter: Adapter = {
  name: 'memory',
  maxGrade: 'nursery',
  capabilities: ['ttl'], // expiry-on-read only — unbounded, no single-flight
  async open<T>(_namespace: string, opts: CacheOptions = {}): Promise<Cache<T>> {
    return new MemoryCache<T>(opts.defaultTtlMs ?? DEFAULT_TTL_MS)
  },
}
