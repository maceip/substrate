// adapters/graduated.ts — GRADUATED grade
//
// The heaviest dependency-free approximation of a real attestation boundary. Same Ed25519
// primitive as elementary, plus the three things the graduated gate makes mandatory:
// ROTATION with overlapping validity (a keyring under .data/graduated/<issuer>/ — one
// private pem per key at mode 0600, keyring.json carrying only public halves; retired keys
// keep verifying old proofs while new proofs use the active key), AGGREGATION (verifyBatch:
// a batch of proofs, one verdict), and a POLICY hook (required expiry, max claim age —
// checked after the signature, because genuine and acceptable are different questions).
//
// The REAL graduated step is TEE/remote attestation + a managed KMS doing the rotation +
// policy verification (the catalog ladder). This adapter holds the same port and the same
// capability names ('rotation-supported', 'proof-aggregation', 'policy-checked'), so the
// gate evaluator and the app cannot tell the difference, and the swap is one adapter file.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign as cryptoSign, verify as cryptoVerify } from 'node:crypto'
import type { KeyObject } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, Attestor, Claim, KeyInfo, Proof, VerifyPolicy, VerifyResult } from '../port.ts'
import { assertValidClaim, canonicalClaim, claimExpired, proofShapeError } from '../port.ts'
import { keyIdOf } from './ed25519.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data', 'graduated')
const ALGORITHM = 'ed25519'

// keyring.json carries ONLY public material — private pems live one-per-key beside it,
// mode 0600, so "what verifies" and "what signs" never share a file.
interface RingKey {
  keyId: string
  createdAt: string
  publicPem: string
  retiredAt: string | null // retired keys still verify — overlapping validity
}

interface Keyring {
  active: string
  keys: RingKey[]
}

async function mintKey(dir: string): Promise<RingKey> {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const keyId = keyIdOf(publicKey)
  await writeFile(join(dir, `${keyId}.pem`), privateKey.export({ type: 'pkcs8', format: 'pem' }), { flag: 'wx', mode: 0o600 })
  return { keyId, createdAt: new Date().toISOString(), publicPem: publicKey.export({ type: 'spki', format: 'pem' }) as string, retiredAt: null }
}

async function flushRing(dir: string, ring: Keyring): Promise<void> {
  const path = join(dir, 'keyring.json')
  const tmp = `${path}.${randomUUID()}.tmp`
  await writeFile(tmp, JSON.stringify(ring, null, 2))
  await rename(tmp, path) // atomic on POSIX — a crash mid-rotate never tears the keyring
}

async function loadRing(dir: string): Promise<Keyring> {
  await mkdir(dir, { recursive: true })
  try {
    return JSON.parse(await readFile(join(dir, 'keyring.json'), 'utf8')) as Keyring
  } catch {
    const first = await mintKey(dir)
    const ring: Keyring = { active: first.keyId, keys: [first] }
    await flushRing(dir, ring)
    return ring
  }
}

class GraduatedAttestor implements Attestor {
  private dir: string
  private ring: Keyring
  private activeKey: KeyObject
  private policy: VerifyPolicy

  constructor(dir: string, ring: Keyring, activeKey: KeyObject, policy: VerifyPolicy) {
    this.dir = dir
    this.ring = ring
    this.activeKey = activeKey
    this.policy = policy
  }

  private activeEntry(): RingKey {
    const e = this.ring.keys.find((k) => k.keyId === this.ring.active)
    if (!e) throw new Error(`keyring corrupt: active key ${this.ring.active} not in ring`)
    return e
  }

  async sign(claim: Claim): Promise<Proof> {
    assertValidClaim(claim)
    const signature = cryptoSign(null, Buffer.from(canonicalClaim(claim)), this.activeKey).toString('hex')
    return { claim, keyId: this.ring.active, algorithm: ALGORITHM, signature }
  }

  // Fail-closed: every exit is {valid:false, reason} or {valid:true, claim}. Never a throw.
  // Lookup is by proof.keyId across the WHOLE ring — that is the overlapping validity.
  async verify(proof: Proof): Promise<VerifyResult> {
    try {
      const shape = proofShapeError(proof)
      if (shape) return { valid: false, reason: shape }
      if (proof.algorithm !== ALGORITHM) return { valid: false, reason: `unknown-algorithm: ${proof.algorithm}` }
      const entry = this.ring.keys.find((k) => k.keyId === proof.keyId)
      if (!entry) return { valid: false, reason: 'unknown-key' }
      let ok = false
      try {
        ok = cryptoVerify(null, Buffer.from(canonicalClaim(proof.claim)), createPublicKey(entry.publicPem), Buffer.from(proof.signature, 'hex'))
      } catch {
        ok = false
      }
      if (!ok) return { valid: false, reason: 'bad-signature' }
      if (claimExpired(proof.claim)) return { valid: false, reason: 'expired' }
      // The policy hook — what 'policy-checked' names. After the signature on purpose:
      // a policy rejection means "genuine but unacceptable", never "maybe forged".
      if (this.policy.requireExpiry && proof.claim.expiresAt === undefined) return { valid: false, reason: 'policy: expiry-required' }
      if (this.policy.maxClaimAgeMs !== undefined && Date.now() - Date.parse(proof.claim.issuedAt) > this.policy.maxClaimAgeMs)
        return { valid: false, reason: 'policy: claim-too-old' }
      return { valid: true, claim: proof.claim }
    } catch (e) {
      return { valid: false, reason: `verify-error: ${(e as Error).message}` }
    }
  }

  // Proof aggregation — what 'proof-aggregation' names: a batch, one verdict, per-proof detail.
  async verifyBatch(proofs: Proof[]): Promise<{ allValid: boolean; results: VerifyResult[] }> {
    const results: VerifyResult[] = []
    for (const p of proofs) results.push(await this.verify(p))
    return { allValid: results.length > 0 && results.every((r) => r.valid), results }
  }

  async keyInfo(): Promise<KeyInfo> {
    const e = this.activeEntry()
    return { keyId: e.keyId, createdAt: e.createdAt, algorithm: ALGORITHM }
  }

  // Rotation with overlapping validity: the old key is retired, not removed — its public
  // half keeps verifying every proof it ever signed. New proofs use the new key.
  async rotate(): Promise<KeyInfo> {
    const fresh = await mintKey(this.dir)
    this.activeEntry().retiredAt = fresh.createdAt
    this.ring.keys.push(fresh)
    this.ring.active = fresh.keyId
    await flushRing(this.dir, this.ring)
    this.activeKey = createPrivateKey(await readFile(join(this.dir, `${fresh.keyId}.pem`), 'utf8'))
    return { keyId: fresh.keyId, createdAt: fresh.createdAt, algorithm: ALGORITHM }
  }

  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'graduated',
  maxGrade: 'graduated',
  capabilities: ['expiry-enforced', 'asymmetric-keys', 'key-persisted', 'rotation-supported', 'proof-aggregation', 'policy-checked'],
  async open(issuer: string, policy: VerifyPolicy = {}): Promise<Attestor> {
    const dir = join(DATA_DIR, issuer.replace(/[^a-z0-9_-]/gi, '_'))
    const ring = await loadRing(dir)
    const activeKey = createPrivateKey(await readFile(join(dir, `${ring.active}.pem`), 'utf8'))
    return new GraduatedAttestor(dir, ring, activeKey, policy)
  },
}
