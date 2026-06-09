// adapters/structured.ts — ELEMENTARY grade (the default).
//
// JSON lines, level filtering (LOG_LEVEL), and redaction of secret-looking fields. Earns the
// `structured` + `redaction` capabilities the prod gate requires. The write function is
// injectable so tests can capture output deterministically.

import type { Fields, Level, Logger, Sink } from '../port.ts'

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const SECRET_KEYS = new Set(['password', 'token', 'secret', 'authorization', 'api_key', 'apikey', 'cookie'])

function redact(fields: Fields): Fields {
  const out: Fields = {}
  for (const [k, v] of Object.entries(fields)) out[k] = SECRET_KEYS.has(k.toLowerCase()) ? '[redacted]' : v
  return out
}

export function makeStructured(write: (s: string) => void, base: Fields = {}): Logger {
  const threshold = RANK[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? RANK.info
  const emit = (level: Level) => (msg: string, fields?: Fields) => {
    if (RANK[level] < threshold) return
    write(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...redact({ ...base, ...fields }) }))
  }
  return {
    debug: emit('debug'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
    child: (fields) => makeStructured(write, { ...base, ...fields }),
  }
}

export const sink: Sink = {
  name: 'structured',
  maxGrade: 'elementary',
  capabilities: ['structured', 'redaction'],
  create: (base) => makeStructured((s) => process.stdout.write(s + '\n'), base),
}
