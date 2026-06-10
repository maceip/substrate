// adapters/lru.ts — ELEMENTARY grade (the default)
//
// Bounded LRU with real TTL eviction and single-flight getOrFill — dependency-free, one
// process. Map iteration order is insertion order, so delete+re-set on read keeps the map
// sorted by recency; at capacity, expired entries are evicted first, then the least
// recently used. Concurrent misses for one key share ONE in-flight fill (the stampede seam
// that earns `single-flight`). No background sweeper, so no timer ever holds the process
// open — eviction happens on write, expiry on read.

import type { Adapter, Cache, CacheOptions } from '../port.ts'

const DEFAULT_TTL_MS = 60_000
const DEFAULT_MAX_ENTRIES = 1024

interface Entry<T> {
  value: T
  expiresAt: number
}

class LruCache<T> implements Cache<T> {
  private entries = new Map<string, Entry<T>>()
  private pending = new Map<string, Promise<T>>() // in-flight fills, keyed like entries
  private defaultTtlMs: number
  private maxEntries: number

  constructor(defaultTtlMs: number, maxEntries: number) {
    this.defaultTtlMs = defaultTtlMs
    this.maxEntries = maxEntries
  }

  async get(key: string): Promise<T | undefined> {
    const e = this.entries.get(key)
    if (!e) return undefined
    if (Date.now() >= e.expiresAt) {
      this.entries.delete(key)
      return undefined
    }
    this.entries.delete(key)
    this.entries.set(key, e) // refresh recency — Map order IS the LRU order
    return e.value
  }
  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    this.entries.delete(key)
    if (this.entries.size >= this.maxEntries) this.evict()
    this.entries.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) })
  }
  // Real TTL eviction: dead entries go first; only then is a live one sacrificed (LRU).
  private evict(): void {
    const now = Date.now()
    for (const [k, e] of this.entries) if (now >= e.expiresAt) this.entries.delete(k)
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }
  async del(key: string): Promise<boolean> {
    return this.entries.delete(key)
  }
  // Single-flight: between the miss and pending.set everything is synchronous, so every
  // concurrent caller either registers THE fill or awaits the one already in flight.
  async getOrFill(key: string, fill: () => Promise<T>, ttlMs?: number): Promise<T> {
    const hit = await this.get(key)
    if (hit !== undefined) return hit
    const inFlight = this.pending.get(key)
    if (inFlight) return inFlight
    const flight = (async () => {
      try {
        const value = await fill()
        await this.set(key, value, ttlMs)
        return value
      } finally {
        this.pending.delete(key) // a failed fill releases the key; the next miss retries
      }
    })()
    this.pending.set(key, flight)
    return flight
  }
  async clear(): Promise<void> {
    this.entries.clear()
  }
  async close(): Promise<void> {
    this.entries.clear()
    this.pending.clear() // no timers to clear — nothing here can hold the process open
  }
}

export const adapter: Adapter = {
  name: 'lru',
  maxGrade: 'elementary',
  capabilities: ['ttl', 'bounded', 'single-flight'],
  async open<T>(_namespace: string, opts: CacheOptions = {}): Promise<Cache<T>> {
    return new LruCache<T>(opts.defaultTtlMs ?? DEFAULT_TTL_MS, opts.maxEntries ?? DEFAULT_MAX_ENTRIES)
  },
}
