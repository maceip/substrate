// schema.ts — THE DATA SHAPE
//
// The baseline every persisted record carries. This is the "structure is pre-installed,
// you decide nothing early" half of the freedom principle: you get id + timestamps +
// version for free, so when a gate later demands them (see gates.ts) they are already
// there and nothing has to be retrofitted.
//
// Nursery rule: this is the THINNEST real shape that works. Not a stub. A real record.

export interface BaseRecord {
  id: string
  created_at: string // ISO-8601
  updated_at: string // ISO-8601
  version: number // bumped on every update; the seam schema-evolution + optimistic concurrency hang off
}

export const BASE_FIELDS = ['id', 'created_at', 'updated_at', 'version'] as const
export type BaseField = (typeof BASE_FIELDS)[number]

function now(): string {
  return new Date().toISOString()
}

// stampNew: turn a bare domain value into a full record. Called by adapters on create.
export function stampNew<T extends object>(value: T): T & BaseRecord {
  const ts = now()
  return { ...value, id: crypto.randomUUID(), created_at: ts, updated_at: ts, version: 1 }
}

// stampUpdate: apply a patch and advance the version + updated_at. The version bump is
// what makes "version-field" (a gate requirement) meaningful rather than decorative.
export function stampUpdate<T extends BaseRecord>(prev: T, patch: Partial<T>): T {
  return { ...prev, ...patch, id: prev.id, created_at: prev.created_at, updated_at: now(), version: prev.version + 1 }
}

// hasBaseField: schema introspection used by the gate evaluator to check, at runtime,
// that a record type actually carries a field a gate now requires (MOSS: the check runs).
export function hasBaseField(sample: object, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(sample, name)
}
