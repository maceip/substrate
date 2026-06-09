// adapters/sink.ts — GRADUATED grade.
//
// Structured JSON plus: every logger carries a correlation id, and lines are shipped to a
// central sink. A real impl posts to OTel/Datadog/Better Stack; this thin-but-real baseline
// ships to an in-process buffer (exported for inspection) so it runs without external infra
// while declaring the `sink` + `correlation` capabilities the multi-instance gate requires.
//
// To make real: replace `ship` with an HTTP/OTel exporter.

import type { Fields, Logger, Sink } from '../port.ts'
import { makeStructured } from './structured.ts'

export const shipped: string[] = [] // stand-in for the remote sink
function ship(s: string): void {
  shipped.push(s)
  process.stdout.write(s + '\n')
}

export const sink: Sink = {
  name: 'sink',
  maxGrade: 'graduated',
  capabilities: ['structured', 'redaction', 'sink', 'correlation'],
  create: (base?: Fields): Logger => {
    const correlationId = (base?.correlationId as string) ?? crypto.randomUUID()
    return makeStructured(ship, { correlationId, ...base })
  },
}
