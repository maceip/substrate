// adapters/hmac.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: an in-memory HMAC-SHA256 signer with an
// ephemeral random key per issuer per process. Fine inside one process — sign and verify
// share the secret because they ARE the same process — but it tops out at `nursery` on
// purpose: the key dies with the process (every proof orphaned at restart), and an external
// verifier would need the secret itself, which would make the verifier a signer. It still
// enforces canonical bytes, fail-closed verification and read-time expiry — those are PORT
// guarantees, not graduated luxuries.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Adapter, Attestor, Claim, KeyInfo, Proof, VerifyResult } from '../port.ts'
import { assertValidClaim, canonicalClaim, claimExpired, proofShapeError } from '../port.ts'

const ALGORITHM = 'hmac-sha256'

interface Key {
  secret: Buffer
  keyId: string // sha256 fingerprint of the secret — derived, never invertible
  createdAt: string
}

// Process-local keychain: two opens of the same issuer in one process interoperate, which is
// exactly as far as a symmetric nursery key should reach.
const KEYCHAIN = new Map<string, Key>()

function keyFor(issuer: string): Key {
  let k = KEYCHAIN.get(issuer)
  if (!k) {
    const secret = randomBytes(32)
    k = { secret, keyId: createHash('sha256').update(secret).digest('hex').slice(0, 16), createdAt: new Date().toISOString() }
    KEYCHAIN.set(issuer, k)
  }
  return k
}

class HmacAttestor implements Attestor {
  private key: Key

  constructor(key: Key) {
    this.key = key
  }

  async sign(claim: Claim): Promise<Proof> {
    assertValidClaim(claim)
    const signature = createHmac('sha256', this.key.secret).update(canonicalClaim(claim)).digest('hex')
    return { claim, keyId: this.key.keyId, algorithm: ALGORITHM, signature }
  }

  // Fail-closed: every exit is {valid:false, reason} or {valid:true, claim}. Never a throw.
  async verify(proof: Proof): Promise<VerifyResult> {
    try {
      const shape = proofShapeError(proof)
      if (shape) return { valid: false, reason: shape }
      if (proof.algorithm !== ALGORITHM) return { valid: false, reason: `unknown-algorithm: ${proof.algorithm}` }
      if (proof.keyId !== this.key.keyId) return { valid: false, reason: 'unknown-key' }
      const expect = Buffer.from(createHmac('sha256', this.key.secret).update(canonicalClaim(proof.claim)).digest('hex'))
      const got = Buffer.from(proof.signature)
      if (got.length !== expect.length || !timingSafeEqual(got, expect)) return { valid: false, reason: 'bad-signature' }
      if (claimExpired(proof.claim)) return { valid: false, reason: 'expired' }
      return { valid: true, claim: proof.claim }
    } catch (e) {
      return { valid: false, reason: `verify-error: ${(e as Error).message}` }
    }
  }

  async keyInfo(): Promise<KeyInfo> {
    return { keyId: this.key.keyId, createdAt: this.key.createdAt, algorithm: ALGORITHM }
  }
  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'hmac',
  maxGrade: 'nursery',
  capabilities: ['expiry-enforced'], // no asymmetric-keys (verifiers would need the secret), no key-persisted (dies with the process)
  async open(issuer: string): Promise<Attestor> {
    return new HmacAttestor(keyFor(issuer))
  },
}
