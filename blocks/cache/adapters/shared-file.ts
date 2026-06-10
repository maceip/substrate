// adapters/shared-file.ts — GRADUATED grade
//
// The heaviest dependency-free approximation of a shared backend. Entries live as one file
// per key under .data/<namespace>/ (write-temp + atomic rename), so every process on the
// host reads ONE logical cache — a set or del in one process is visible to the next read in
// another. Cross-process single-flight is a lock file taken with O_EXCL ('wx'): the holder
// fills, everyone else polls for the value instead of hitting the source; a stale lock is
// stolen after a deadline so a crashed holder cannot wedge the key.
//
// The REAL graduated step is Redis/Memcached + a distributed lock (the catalog ladder).
// This adapter holds the same port and the same capability names ('shared-backend',
// 'shared-single-flight'), so the gate evaluator and the app cannot tell the difference,
// and the swap to Redis is one adapter file.

import { mkdir, open as openFile, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, Cache, CacheOptions } from '../port.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data')
const DEFAULT_TTL_MS = 60_000
const DEFAULT_MAX_ENTRIES = 1024
const LOCK_POLL_MS = 20 // short-lived, self-clearing — never outlives the operation
const LOCK_STALE_MS = 5_000 // a lock older than this belonged to a crashed holder

interface Entry<T> {
  value: T
  expiresAt: number
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

class SharedFileCache<T> implements Cache<T> {
  private dir: string
  private pending = new Map<string, Promise<T>>() // in-process coalescing, same as lru
  private defaultTtlMs: number
  private maxEntries: number

  constructor(namespace: string, defaultTtlMs: number, maxEntries: number) {
    this.dir = join(DATA_DIR, namespace.replace(/[^a-z0-9_-]/gi, '_'))
    this.defaultTtlMs = defaultTtlMs
    this.maxEntries = maxEntries
  }

  private path(key: string): string {
    return join(this.dir, `${createHash('sha256').update(key).digest('hex').slice(0, 32)}.json`)
  }

  async get(key: string): Promise<T | undefined> {
    let e: Entry<T>
    try {
      e = JSON.parse(await readFile(this.path(key), 'utf8')) as Entry<T>
    } catch {
      return undefined // missing file == miss; a torn read is treated the same
    }
    if (Date.now() >= e.expiresAt) {
      await rm(this.path(key), { force: true }) // lazy reclaim, like every grade
      return undefined
    }
    return e.value
  }
  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    await mkdir(this.dir, { recursive: true })
    const entry: Entry<T> = { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) }
    const tmp = `${this.path(key)}.${randomUUID()}.tmp`
    await writeFile(tmp, JSON.stringify(entry))
    await rename(tmp, this.path(key)) // atomic — readers see old or new, never torn
    await this.enforceBound()
  }
  // Bounded: when the namespace exceeds maxEntries, the oldest-written files go first.
  // (Expiry stays read-time; this bound is about disk/entry count, not freshness.)
  private async enforceBound(): Promise<void> {
    let names: string[]
    try {
      names = (await readdir(this.dir)).filter((n) => n.endsWith('.json'))
    } catch {
      return
    }
    if (names.length <= this.maxEntries) return
    const aged = await Promise.all(
      names.map(async (n) => {
        try {
          return { n, mtime: (await stat(join(this.dir, n))).mtimeMs }
        } catch {
          return null
        }
      }),
    )
    const oldestFirst = aged.filter((a) => a !== null).sort((a, b) => a.mtime - b.mtime)
    for (const a of oldestFirst.slice(0, oldestFirst.length - this.maxEntries)) {
      await rm(join(this.dir, a.n), { force: true })
    }
  }
  async del(key: string): Promise<boolean> {
    try {
      await unlink(this.path(key))
      return true
    } catch {
      return false
    }
  }
  async getOrFill(key: string, fill: () => Promise<T>, ttlMs?: number): Promise<T> {
    const hit = await this.get(key)
    if (hit !== undefined) return hit
    const inFlight = this.pending.get(key)
    if (inFlight) return inFlight
    const flight = (async () => {
      try {
        return await this.lockedFill(key, fill, ttlMs)
      } finally {
        this.pending.delete(key)
      }
    })()
    this.pending.set(key, flight)
    return flight
  }
  // The cross-process half of single-flight: whoever creates the lock file fills; everyone
  // else polls for the value. 'wx' (O_EXCL) makes the acquisition atomic on the filesystem.
  private async lockedFill(key: string, fill: () => Promise<T>, ttlMs?: number): Promise<T> {
    await mkdir(this.dir, { recursive: true })
    const lockPath = `${this.path(key)}.lock`
    for (;;) {
      try {
        const fh = await openFile(lockPath, 'wx')
        await fh.close()
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
        // Another process holds the lock: wait for its value rather than fill twice.
        await sleep(LOCK_POLL_MS)
        const filled = await this.get(key)
        if (filled !== undefined) return filled
        try {
          if (Date.now() - (await stat(lockPath)).mtimeMs > LOCK_STALE_MS) await rm(lockPath, { force: true })
        } catch {
          /* lock vanished between poll and stat — loop and try to take it */
        }
        continue
      }
      try {
        const raced = await this.get(key) // a peer may have filled between our miss and the lock
        if (raced !== undefined) return raced
        const value = await fill()
        await this.set(key, value, ttlMs)
        return value
      } finally {
        await rm(lockPath, { force: true })
      }
    }
  }
  async clear(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true })
  }
  async close(): Promise<void> {
    this.pending.clear() // poll timers are one-shot and already settled — nothing persists
  }
}

export const adapter: Adapter = {
  name: 'shared-file',
  maxGrade: 'graduated',
  capabilities: ['ttl', 'bounded', 'single-flight', 'shared-backend', 'shared-single-flight'],
  async open<T>(namespace: string, opts: CacheOptions = {}): Promise<Cache<T>> {
    return new SharedFileCache<T>(namespace, opts.defaultTtlMs ?? DEFAULT_TTL_MS, opts.maxEntries ?? DEFAULT_MAX_ENTRIES)
  },
}
