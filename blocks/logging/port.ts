// port.ts — THE PORT for the logging/observability block. [PROTECTED]
//
// App code logs through a Logger from ./index.ts and never calls console.* directly. The
// seam this absorbs: WHERE logs go and HOW they're shaped (console string -> structured JSON
// -> external sink) changes behind the port; the call sites do not.

export type { Grade } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

export type Level = 'debug' | 'info' | 'warn' | 'error'
export interface Fields {
  [k: string]: unknown
}

export interface Logger {
  debug(msg: string, fields?: Fields): void
  info(msg: string, fields?: Fields): void
  warn(msg: string, fields?: Fields): void
  error(msg: string, fields?: Fields): void
  child(fields: Fields): Logger
}

// A Sink is what an adapter provides: a factory for Loggers at a given grade.
export interface Sink {
  name: string
  maxGrade: Grade
  capabilities: string[]
  create(base?: Fields): Logger
}
