// adapters/file.ts — ELEMENTARY grade (the nursery DEFAULT for real projects)
//
// Durable, dependency-free, single-process. Writes go to a JSON file via write-temp +
// atomic rename, so a crash mid-write cannot corrupt the store — that earns the
// `atomic-write` capability and lets it satisfy the `durable-writes` requirement the
// nursery->elementary gate activates. Still one process, no pool, no MVCC, so it tops out
// at `elementary`. App code does not change one character moving here from memory.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, Store } from '../port.ts'
import type { BaseRecord } from '../schema.ts'
import { stampNew, stampUpdate } from '../schema.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data')

class FileStore<T extends BaseRecord> implements Store<T> {
  private path: string
  private cache: Map<string, T> | null = null

  constructor(collection: string) {
    this.path = join(DATA_DIR, `${collection}.json`)
  }

  private async load(): Promise<Map<string, T>> {
    if (this.cache) return this.cache
    try {
      const raw = await readFile(this.path, 'utf8')
      const arr = JSON.parse(raw) as T[]
      this.cache = new Map(arr.map((r) => [r.id, r]))
    } catch {
      this.cache = new Map()
    }
    return this.cache
  }

  private async flush(rows: Map<string, T>): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true })
    const tmp = `${this.path}.${crypto.randomUUID()}.tmp`
    await writeFile(tmp, JSON.stringify([...rows.values()], null, 2))
    await rename(tmp, this.path) // atomic on POSIX — the durability guarantee
  }

  async get(id: string): Promise<T | null> {
    return (await this.load()).get(id) ?? null
  }
  async list(): Promise<T[]> {
    return [...(await this.load()).values()]
  }
  async create(value: Omit<T, keyof BaseRecord>): Promise<T> {
    const rows = await this.load()
    const rec = stampNew(value) as T
    rows.set(rec.id, rec)
    await this.flush(rows)
    return rec
  }
  async update(id: string, patch: Partial<Omit<T, keyof BaseRecord>>): Promise<T | null> {
    const rows = await this.load()
    const prev = rows.get(id)
    if (!prev) return null
    const next = stampUpdate(prev, patch as Partial<T>)
    rows.set(id, next)
    await this.flush(rows)
    return next
  }
  async remove(id: string): Promise<boolean> {
    const rows = await this.load()
    const ok = rows.delete(id)
    if (ok) await this.flush(rows)
    return ok
  }
  async count(): Promise<number> {
    return (await this.load()).size
  }
  async close(): Promise<void> {
    this.cache = null
  }
}

export const adapter: Adapter = {
  name: 'file',
  maxGrade: 'elementary',
  capabilities: ['atomic-write'],
  async open<T extends BaseRecord>(collection: string): Promise<Store<T>> {
    return new FileStore<T>(collection)
  },
}
