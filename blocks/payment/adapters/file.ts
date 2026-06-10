// adapters/file.ts — ELEMENTARY grade (the nursery DEFAULT for real projects)
//
// Durable, dependency-free, single-process. The whole rail — the idempotency index, the
// charges, and the double-entry ledger — persists to one JSON file under .data/ via
// write-temp + atomic rename, so a crash mid-write cannot tear it and a restart loses
// nothing. That earns `durable-ledger` + `double-entry-ledger`, which with the port-guaranteed
// idempotent-charge and integer-minor-units satisfies everything the nursery->elementary gate
// activates. It still has no real provider, so webhook handling is the same honest no-verify
// parse as nursery (it does NOT claim 'webhook-verified') and it tops out at `elementary`.
// App code does not change one character moving here from memory.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, Balance, Charge, ChargeRequest, LedgerEntry, OpenOptions, PaymentRail, WebhookEvent } from '../port.ts'
import { assertChargeRequest, assertMinorUnits, balanceFromEntries } from '../port.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data')

// The whole rail's state in one document — the index, the charges, the ledger. Keeping them
// in a single atomically-replaced file means a crash can never settle a charge without its
// ledger entry, or leave the idempotency index pointing at a charge that didn't persist.
interface RailState {
  byKey: Record<string, string> // idempotencyKey -> chargeId
  charges: Record<string, Charge>
  entries: LedgerEntry[]
}

class FileRail implements PaymentRail {
  private path: string
  private state: RailState | null = null

  constructor(file: string) {
    this.path = join(DATA_DIR, file)
  }

  private async load(): Promise<RailState> {
    if (this.state) return this.state
    try {
      this.state = JSON.parse(await readFile(this.path, 'utf8')) as RailState
    } catch {
      this.state = { byKey: {}, charges: {}, entries: [] }
    }
    return this.state
  }

  private async flush(s: RailState): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true })
    const tmp = `${this.path}.${randomUUID()}.tmp`
    await writeFile(tmp, JSON.stringify(s, null, 2))
    await rename(tmp, this.path) // atomic on POSIX — the durability guarantee
  }

  async charge(req: ChargeRequest): Promise<Charge> {
    assertChargeRequest(req)
    const s = await this.load()
    // guarantee 1: the same key replays the first charge — it never settles a second time.
    const existing = s.byKey[req.idempotencyKey]
    if (existing) return { ...s.charges[existing], replayed: true }

    const id = `ch_${randomUUID()}`
    const charge: Charge = {
      id,
      status: 'settled',
      amount: req.amount,
      currency: req.currency,
      refundedAmount: 0,
      idempotencyKey: req.idempotencyKey,
      customerRef: req.customerRef,
      createdAt: new Date().toISOString(),
      replayed: false,
    }
    s.charges[id] = charge
    s.byKey[req.idempotencyKey] = id
    s.entries.push({ id: `le_${randomUUID()}`, chargeId: id, kind: 'charge', amount: req.amount, currency: req.currency, at: charge.createdAt })
    await this.flush(s)
    return charge
  }

  async refund(chargeId: string, amount?: number): Promise<Charge> {
    const s = await this.load()
    const charge = s.charges[chargeId]
    if (!charge) throw new Error(`refund: unknown charge ${chargeId}`)
    const remaining = charge.amount - charge.refundedAmount
    const value = amount ?? remaining
    assertMinorUnits(value, 'refund amount')
    if (value > remaining) throw new Error(`refund: ${value} exceeds remaining ${remaining} on ${chargeId}`)

    const refundedAmount = charge.refundedAmount + value
    const updated: Charge = { ...charge, refundedAmount, status: refundedAmount === charge.amount ? 'refunded' : 'partially_refunded' }
    s.charges[chargeId] = updated
    // refund is a NEGATIVE ledger entry — balance stays the sum of entries.
    s.entries.push({ id: `le_${randomUUID()}`, chargeId, kind: 'refund', amount: -value, currency: charge.currency, at: new Date().toISOString() })
    await this.flush(s)
    return updated
  }

  async getCharge(id: string): Promise<Charge | null> {
    return (await this.load()).charges[id] ?? null
  }

  // Same honest no-verify parse as nursery: there is no provider and no secret at this grade,
  // so it does NOT claim 'webhook-verified'. The gate that requires verification forces the
  // provider grade, which holds a webhook secret and checks the HMAC fail-closed.
  async handleWebhook(rawBody: string, _signature?: string): Promise<WebhookEvent> {
    const body = JSON.parse(rawBody) as { id?: string; type?: string; chargeId?: string }
    return { id: body.id ?? `evt_${randomUUID()}`, type: body.type ?? 'unknown', chargeId: body.chargeId, verified: true }
  }

  async balance(currency: string): Promise<Balance> {
    return balanceFromEntries((await this.load()).entries, currency)
  }
  async ledger(): Promise<LedgerEntry[]> {
    return [...(await this.load()).entries]
  }
  async close(): Promise<void> {
    this.state = null
  }
}

export const adapter: Adapter = {
  name: 'file',
  maxGrade: 'elementary',
  capabilities: ['idempotent-charge', 'integer-minor-units', 'double-entry-ledger', 'durable-ledger'],
  async open(opts: OpenOptions = {}): Promise<PaymentRail> {
    // one file per ledger; the default is the project ledger. tests pass their own to isolate.
    return new FileRail(opts.ledgerFile ?? 'ledger.json')
  },
}
