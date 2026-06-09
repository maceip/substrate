// adapters/dotenv-file.ts — ELEMENTARY grade (the default).
//
// Loads a .env file (dependency-free parser) layered under process.env, and supports the
// .env.example manifest convention — which is what earns the `example-file` capability the
// nursery->elementary gate requires once a project has secrets.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Source } from '../port.ts'

const BLOCK_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    out[key] = val
  }
  return out
}

function loadFile(name: string): Record<string, string> {
  try {
    return parseDotenv(readFileSync(join(BLOCK_DIR, name), 'utf8'))
  } catch {
    return {}
  }
}

const fileVars = loadFile('.env')

export const source: Source = {
  name: 'dotenv-file',
  maxGrade: 'elementary',
  capabilities: ['example-file'],
  raw: (key) => process.env[key] ?? fileVars[key],
}
