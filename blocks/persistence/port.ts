// port.ts — THE PORT
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping the storage engine (in-memory -> file -> postgres) must pass through
// here and change NOTHING above it. App code imports from ./index.ts, which re-exports this.
// App code NEVER imports an adapter directly.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// failing case) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

import type { BaseRecord } from './schema.ts'

// Grade is the ladder every block shares (nursery < elementary < graduated). The app cannot
// tell which grade is behind the port — that is the whole point.
export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// Store<T>: the contract. Every adapter, at every grade, satisfies exactly this.
export interface Store<T extends BaseRecord> {
  get(id: string): Promise<T | null>
  list(): Promise<T[]>
  create(value: Omit<T, keyof BaseRecord>): Promise<T>
  update(id: string, patch: Partial<Omit<T, keyof BaseRecord>>): Promise<T | null>
  remove(id: string): Promise<boolean>
  count(): Promise<number>
  close(): Promise<void>
}

// Adapter: what each adapter file exports. The port is the SHAPE (Store); the adapter is the
// swappable thing behind it. `maxGrade` is the highest grade whose requirements this adapter
// can satisfy; `capabilities` are the named guarantees the gate evaluator checks against.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open<T extends BaseRecord>(collection: string): Promise<Store<T>>
}
