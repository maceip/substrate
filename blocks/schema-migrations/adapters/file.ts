// adapters/file.ts — ELEMENTARY grade (the DEFAULT for real projects)
//
// Durable, dependency-free, single-process. The journal of applied migrations lives in a
// JSON file per scope, written via write-temp + atomic rename (the same durability move as
// persistence/adapters/file.ts) — that earns the `journal` capability and satisfies the
// `history-recorded` requirement the nursery->elementary gate activates. Re-runs are
// idempotent across processes and deploys. No checksum verification yet, so it tops out at
// `elementary`. Neither app code nor the migration files change one character moving here
// from memory.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, AppliedMigration, Migrator } from '../port.ts'
import { BaseMigrator } from './_base.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data')

class FileMigrator extends BaseMigrator {
  private path: string

  constructor(scope: string) {
    super()
    this.path = join(DATA_DIR, `${scope}.journal.json`)
  }

  protected async load(): Promise<AppliedMigration[]> {
    try {
      return JSON.parse(await readFile(this.path, 'utf8')) as AppliedMigration[]
    } catch {
      return []
    }
  }

  protected async save(history: AppliedMigration[]): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true })
    const tmp = `${this.path}.${crypto.randomUUID()}.tmp`
    await writeFile(tmp, JSON.stringify(history, null, 2))
    await rename(tmp, this.path) // atomic on POSIX — the durability guarantee
  }
}

export const adapter: Adapter = {
  name: 'file',
  maxGrade: 'elementary',
  capabilities: ['journal'],
  async open(scope: string): Promise<Migrator> {
    return new FileMigrator(scope)
  },
}
