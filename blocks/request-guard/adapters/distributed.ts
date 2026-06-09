// adapters/distributed.ts — GRADUATED grade.
//
// A shared limiter (Redis/Upstash) so the quota holds ACROSS instances, plus bot/WAF detection.
// Behind the bare nursery a per-process memory counter lets a caller multiply their quota by the
// instance count — which is exactly what the multi-instance gate flags. Needs Redis, so it does
// not run unwired.
//
// To activate:  npm i ioredis   set GUARD_IMPL=distributed + REDIS_URL, implement create() with
// an atomic INCR + EXPIRE (or a token-bucket Lua script) keyed by the caller.

import type { Guard } from '../port.ts'

export const guard: Guard = {
  name: 'distributed',
  maxGrade: 'graduated',
  capabilities: ['rate-limit', 'sliding-window', 'shield', 'distributed', 'bot-detection'],
  create() {
    throw new Error('distributed adapter not wired: npm i ioredis, set REDIS_URL, implement an atomic INCR/EXPIRE limiter')
  },
}
