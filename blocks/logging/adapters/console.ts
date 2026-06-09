// adapters/console.ts — NURSERY grade. Human-readable lines to stdout. No JSON, no redaction.

import type { Fields, Level, Logger, Sink } from '../port.ts'

function line(level: Level, msg: string, fields?: Fields): string {
  const tail = fields && Object.keys(fields).length ? ' ' + JSON.stringify(fields) : ''
  return `[${level}] ${msg}${tail}`
}

function make(base: Fields = {}): Logger {
  const emit = (level: Level) => (msg: string, fields?: Fields) => console.log(line(level, msg, { ...base, ...fields }))
  return {
    debug: emit('debug'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
    child: (fields) => make({ ...base, ...fields }),
  }
}

export const sink: Sink = {
  name: 'console',
  maxGrade: 'nursery',
  capabilities: [],
  create: (base) => make(base),
}
