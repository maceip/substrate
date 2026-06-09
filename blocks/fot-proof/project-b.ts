// project-b.ts — a SEPARATE, later project. It pulls the persistence block and reads the
// federated lessons. It does NOT import project-a, does not know project-a exists, and shares
// no code or data with it. Anything it learns here came across the federation boundary on its
// own. This is the withdrawal side of FoT.

import { insights } from '../persistence/index.ts'

const got = insights()
console.log(`[project-b] recalled ${got.length} federated lesson(s) for the persistence block:`)
for (const i of got) console.log(`  - (from ${i.origin}) ${i.text}`)
