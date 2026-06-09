// adapters/graduated.ts — GRADUATED grade
//
// The heavy real implementation behind the SAME port: postgres via a connection pool.
// Present and shaped, but it needs a running server + the `pg` package, so it does not
// execute in the bare nursery. That is correct: graduation is a deliberate step, and the
// gate evaluator (gates.ts) is what tells you the moment your project has earned it.
//
// To activate:  npm i pg   and set  PERSIST_ADAPTER=graduated  DATABASE_URL=postgres://...
//
// It declares capabilities `engine`, `pool`, `mvcc` — exactly the ones the
// elementary->graduated gate's requirements (connection-pool, concurrent-safe) check for.
// `migrations-registered` is satisfied separately by the migrations the project ships.

import type { Adapter, Store } from '../port.ts'
import type { BaseRecord } from '../schema.ts'
import { stampNew, stampUpdate } from '../schema.ts'

// Lazy import so the file can be type-checked and listed without `pg` installed.
async function getPool() {
  const { Pool } = await import('pg' as string) // throws a clear error if pg is absent
  return new Pool({ connectionString: process.env.DATABASE_URL })
}

class PgStore<T extends BaseRecord> implements Store<T> {
  // One table per collection, single JSONB `doc` column keyed by id. A real schema/migration
  // would normalize columns; this is the thin-but-real graduated baseline.
  constructor(
    private pool: Awaited<ReturnType<typeof getPool>>,
    private table: string,
  ) {}

  static async open<T extends BaseRecord>(collection: string): Promise<PgStore<T>> {
    const pool = await getPool()
    const table = collection.replace(/[^a-z0-9_]/gi, '_')
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (id text PRIMARY KEY, doc jsonb NOT NULL)`)
    return new PgStore<T>(pool, table)
  }

  async get(id: string): Promise<T | null> {
    const r = await this.pool.query(`SELECT doc FROM ${this.table} WHERE id = $1`, [id])
    return r.rows[0]?.doc ?? null
  }
  async list(): Promise<T[]> {
    const r = await this.pool.query(`SELECT doc FROM ${this.table}`)
    return r.rows.map((x: { doc: T }) => x.doc)
  }
  async create(value: Omit<T, keyof BaseRecord>): Promise<T> {
    const rec = stampNew(value) as T
    await this.pool.query(`INSERT INTO ${this.table}(id, doc) VALUES ($1, $2)`, [rec.id, rec])
    return rec
  }
  async update(id: string, patch: Partial<Omit<T, keyof BaseRecord>>): Promise<T | null> {
    const prev = await this.get(id)
    if (!prev) return null
    const next = stampUpdate(prev, patch as Partial<T>)
    await this.pool.query(`UPDATE ${this.table} SET doc = $2 WHERE id = $1`, [id, next])
    return next
  }
  async remove(id: string): Promise<boolean> {
    const r = await this.pool.query(`DELETE FROM ${this.table} WHERE id = $1`, [id])
    return (r.rowCount ?? 0) > 0
  }
  async count(): Promise<number> {
    const r = await this.pool.query(`SELECT count(*)::int AS n FROM ${this.table}`)
    return r.rows[0].n
  }
  async close(): Promise<void> {
    await this.pool.end()
  }
}

export const adapter: Adapter = {
  name: 'graduated',
  maxGrade: 'graduated',
  capabilities: ['engine', 'pool', 'mvcc'],
  async open<T extends BaseRecord>(collection: string): Promise<Store<T>> {
    return PgStore.open<T>(collection)
  },
}
