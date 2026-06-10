// adapters/graduated.ts — GRADUATED grade
//
// The heaviest dependency-free approximation of a real migration engine: the same durable
// journal as elementary PLUS a source checksum recorded at apply time and verified on every
// plan/apply/rollback. If a migration's up()/down() drifts after it ran somewhere — the
// classic "edited a deployed migration" failure — this adapter refuses instead of pretending
// the history still matches. plan() is therefore a verified dry-run, and rollback re-verifies
// each entry before invoking its down(). A real engine swap later (e.g. a migration table in
// postgres) replaces load/save and nothing else.
//
// It declares capabilities `journal` and `checksum-verify` — exactly the ones the gates'
// requirements (history-recorded, compat-checked) check for. `down-defined` is satisfied
// separately by the migrations the project writes.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, AppliedMigration, Migration, Migrator } from '../port.ts'
import { BaseMigrator, checksumOf } from './_base.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data')

class GraduatedMigrator extends BaseMigrator {
  private path: string

  constructor(scope: string) {
    super()
    this.path = join(DATA_DIR, `${scope}.graduated.json`) // own journal — grades do not share state
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
    await rename(tmp, this.path)
  }

  // stamp: record the source fingerprint alongside the entry — what makes drift detectable.
  protected override stamp(m: Migration, steps: string[]): AppliedMigration {
    return { ...super.stamp(m, steps), checksum: checksumOf(m) }
  }

  // verify: the compatibility gate. An applied entry must have a registered source, and that
  // source must still be what ran. Refusal here is the feature.
  protected override verify(m: Migration | undefined, entry: AppliedMigration): void {
    if (!m) throw new Error(`journal drift: applied migration ${entry.id} has no registered source`)
    if (entry.checksum && entry.checksum !== checksumOf(m))
      throw new Error(`journal drift: ${entry.id} source changed after it was applied (checksum mismatch) — ship a new version instead`)
  }
}

export const adapter: Adapter = {
  name: 'graduated',
  maxGrade: 'graduated',
  capabilities: ['journal', 'checksum-verify'],
  async open(scope: string): Promise<Migrator> {
    return new GraduatedMigrator(scope)
  },
}
