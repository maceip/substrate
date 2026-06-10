// adapters/_base.ts — shared mechanics every grade reuses (freely editable; NOT the port).
//
// Registration, ordering, planning, applying, rolling back are identical at every grade —
// that sameness is what makes the port hold. What a grade actually changes is WHERE the
// history lives (load/save) and WHAT gets verified (stamp/verify). Adapters override
// exactly those four points and nothing else.

import { createHash } from 'node:crypto'
import type { AppliedMigration, Migration, MigrationContext, Migrator, PlanStep } from '../port.ts'

// checksumOf: a stable fingerprint of WHAT a migration does (id, version, up/down source).
// Recorded at apply time by the graduated grade; a later mismatch means someone edited a
// migration after it ran somewhere — the classic drift the catalog calls "compatibility
// across versions".
export function checksumOf(m: Migration): string {
  const src = `${m.id}@${m.version}\nup:${m.up.toString()}\ndown:${m.down?.toString() ?? ''}`
  return createHash('sha256').update(src).digest('hex').slice(0, 16)
}

// capture: run up()/down() with a context that records the declared engine-neutral steps.
// The steps land in the journal entry, so the history says what each migration DID.
async function capture(fn: (ctx: MigrationContext) => void | Promise<void>): Promise<string[]> {
  const steps: string[] = []
  const ctx: MigrationContext = {
    async exec(step: string) {
      if (!step.trim()) throw new Error('ctx.exec: step must be a non-empty string')
      steps.push(step.trim())
    },
  }
  await fn(ctx)
  return steps
}

export abstract class BaseMigrator implements Migrator {
  private list: Migration[] = []

  // The four grade-specific points. load/save: where the history lives. stamp: what a fresh
  // journal entry carries (graduated adds a checksum). verify: what a journal entry is
  // checked against on every plan/apply/rollback (graduated enforces checksums).
  protected abstract load(): Promise<AppliedMigration[]>
  protected abstract save(history: AppliedMigration[]): Promise<void>
  protected stamp(m: Migration, steps: string[]): AppliedMigration {
    return { id: m.id, version: m.version, applied_at: new Date().toISOString(), steps }
  }
  protected verify(_m: Migration | undefined, _entry: AppliedMigration): void {}

  register(m: Migration): void {
    if (!m.id.trim()) throw new Error('migration id must be non-empty')
    if (!Number.isInteger(m.version) || m.version < 1) throw new Error(`migration ${m.id}: version must be a positive integer`)
    for (const x of this.list) {
      if (x.id === m.id) throw new Error(`migration ${m.id}: id already registered`)
      if (x.version === m.version) throw new Error(`migration ${m.id}: version ${m.version} already registered — versions are monotonic`)
    }
    this.list.push(m)
    this.list.sort((a, b) => a.version - b.version)
  }

  registered(): Migration[] {
    return [...this.list]
  }

  async applied(): Promise<AppliedMigration[]> {
    return [...(await this.load())].sort((a, b) => a.version - b.version)
  }

  async plan(currentVersion?: number): Promise<PlanStep[]> {
    const history = await this.load()
    for (const entry of history) this.verify(this.list.find((m) => m.id === entry.id), entry)
    const appliedIds = new Set(history.map((h) => h.id))
    // No argument: what apply() would actually run here (skip the applied set). Explicit
    // currentVersion: the hypothetical "a database at version X" — e.g. a new instance.
    const pending =
      currentVersion === undefined
        ? this.list.filter((m) => !appliedIds.has(m.id))
        : this.list.filter((m) => m.version > currentVersion)
    return pending.map((m) => ({ id: m.id, version: m.version, hasDown: typeof m.down === 'function' }))
  }

  async apply(target?: number): Promise<AppliedMigration[]> {
    const history = await this.load()
    for (const entry of history) this.verify(this.list.find((m) => m.id === entry.id), entry)
    const appliedIds = new Set(history.map((h) => h.id))
    const ran: AppliedMigration[] = []
    for (const m of this.list) {
      if (appliedIds.has(m.id)) continue // idempotent: applying twice = once
      if (target !== undefined && m.version > target) break
      const entry = this.stamp(m, await capture((ctx) => m.up(ctx)))
      history.push(entry)
      ran.push(entry)
    }
    if (ran.length > 0) await this.save(history.sort((a, b) => a.version - b.version))
    return ran
  }

  async rollback(toVersion: number): Promise<AppliedMigration[]> {
    const history = [...(await this.load())].sort((a, b) => a.version - b.version)
    const undone: AppliedMigration[] = []
    for (const entry of [...history].reverse()) {
      if (entry.version <= toVersion) break
      const m = this.list.find((x) => x.id === entry.id)
      this.verify(m, entry)
      if (!m) throw new Error(`rollback: applied migration ${entry.id} is not registered — cannot undo what is unknown`)
      if (!m.down) throw new Error(`rollback: migration ${m.id} has no down() — define it before rolling back past v${m.version}`)
      await capture((ctx) => m.down!(ctx))
      history.splice(history.indexOf(entry), 1)
      undone.push(entry)
    }
    if (undone.length > 0) await this.save(history)
    return undone
  }

  async close(): Promise<void> {}
}
