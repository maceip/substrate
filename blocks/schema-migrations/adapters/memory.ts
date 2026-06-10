// adapters/memory.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: an in-process registry that applies in order
// and tracks the applied set in memory. Real enough to develop and test against; the history
// dies with the process, so a re-deploy forgets what already ran — it tops out at `nursery`.
// Useful in tests and the first five minutes of a project, before any gate has fired.

import type { Adapter, AppliedMigration, Migrator } from '../port.ts'
import { BaseMigrator } from './_base.ts'

class MemoryMigrator extends BaseMigrator {
  private history: AppliedMigration[] = []

  protected async load(): Promise<AppliedMigration[]> {
    return this.history
  }
  protected async save(history: AppliedMigration[]): Promise<void> {
    this.history = history
  }
}

export const adapter: Adapter = {
  name: 'memory',
  maxGrade: 'nursery',
  capabilities: [], // no journal — the applied set does not survive the process
  async open(_scope: string): Promise<Migrator> {
    return new MemoryMigrator()
  },
}
