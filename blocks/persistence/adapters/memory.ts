// adapters/memory.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: an in-process Map. Real enough to build and
// test against; loses data on restart, so it tops out at `nursery`. Useful as the default
// in tests and the first five minutes of a project, before any gate has fired.

import type { Adapter, Store } from '../port.ts'
import type { BaseRecord } from '../schema.ts'
import { stampNew, stampUpdate } from '../schema.ts'

class MemoryStore<T extends BaseRecord> implements Store<T> {
  private rows = new Map<string, T>()

  async get(id: string): Promise<T | null> {
    return this.rows.get(id) ?? null
  }
  async list(): Promise<T[]> {
    return [...this.rows.values()]
  }
  async create(value: Omit<T, keyof BaseRecord>): Promise<T> {
    const rec = stampNew(value) as T
    this.rows.set(rec.id, rec)
    return rec
  }
  async update(id: string, patch: Partial<Omit<T, keyof BaseRecord>>): Promise<T | null> {
    const prev = this.rows.get(id)
    if (!prev) return null
    const next = stampUpdate(prev, patch as Partial<T>)
    this.rows.set(id, next)
    return next
  }
  async remove(id: string): Promise<boolean> {
    return this.rows.delete(id)
  }
  async count(): Promise<number> {
    return this.rows.size
  }
  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'memory',
  maxGrade: 'nursery',
  capabilities: [], // no durability, no pool, no mvcc
  async open<T extends BaseRecord>(_collection: string): Promise<Store<T>> {
    return new MemoryStore<T>()
  },
}
