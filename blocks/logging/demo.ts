// demo.ts — logging against ./index.ts only.  node blocks/logging/demo.ts
//   LOG_SINK=console node blocks/logging/demo.ts

import { getLogger, checkGrade, currentGrade } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== logging block — sink grade: ${grade} ===\n`)

const log = await getLogger({ service: 'demo' })
log.info('server started', { port: 3000 })
log.warn('cache miss', { key: 'user:42' })
// redaction proof: secret-looking fields are scrubbed at elementary+ grade.
log.error('auth failed', { user: 'ada', password: 'hunter2', token: 'abc123' })

const reqLog = log.child({ requestId: 'r-1' })
reqLog.info('handled request', { route: '/notes', status: 200 })

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation:')
console.log(fmt('day 1   (dev)          ', await checkGrade({ prod: false, instances: 1 })))
console.log(fmt('prod    (1 instance)   ', await checkGrade({ prod: true, instances: 1 })))
console.log(fmt('scaled  (4 instances)  ', await checkGrade({ prod: true, instances: 4 })))
console.log('')
