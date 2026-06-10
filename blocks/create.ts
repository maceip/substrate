// create.ts — stamp a NEW PROJECT out of the nursery. This is what the nursery is FOR.
//
//   node blocks/create.ts <target-dir> [project-name]
//
// What the new project gets:
//   <target>/substrate/   ← the kernel + every block, copied verbatim (ports, adapters,
//                           gates, tests — relative imports survive because siblings move
//                           together). nursery-app and fot-proof stay behind; they are this
//                           repo's reference composition and proof, not scaffolding.
//   <target>/app/main.ts  ← a starter service built ONLY against the ports.
//   package.json / tsconfig.json / .gitignore / README.md
//
// Then `git init` + an initial commit, because the committed block.json baselines ARE the
// AEvo protection — a block's gates are armed from the project's first minute.
//
// FoT: nothing to configure. The federation store lives in ~/.substrate/, outside any repo,
// so the new project inherits every lesson already deposited there. Starting a project IS
// the withdrawal; the starter app prints what it inherited.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const [, , targetArg, nameArg] = process.argv
if (!targetArg) {
  console.error('usage: node blocks/create.ts <target-dir> [project-name]')
  process.exit(1)
}
const target = resolve(targetArg)
const name = nameArg ?? basename(target)

if (existsSync(target) && readdirSync(target).length > 0) {
  console.error(`refusing to scaffold into a non-empty directory: ${target}`)
  process.exit(1)
}

// Every block = every directory that isn't kernel/composition/proof plumbing.
const blocks = readdirSync(here, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
  .map((e) => e.name)
  .filter((n) => !['nursery-app', 'fot-proof', 'node_modules'].includes(n))
  .sort()

const keep = (src: string) => !src.includes('/.data') && !src.endsWith('.DS_Store')
mkdirSync(join(target, 'app'), { recursive: true })
cpSync(join(here, '_kernel'), join(target, 'substrate/_kernel'), { recursive: true, filter: keep })
for (const b of blocks) cpSync(join(here, b), join(target, 'substrate', b), { recursive: true, filter: keep })
cpSync(join(here, 'tsconfig.json'), join(target, 'tsconfig.json'))

writeFileSync(
  join(target, '.gitignore'),
  '# runtime data written by the file persistence adapter\n**/.data/\nnode_modules/\n.DS_Store\n',
)

writeFileSync(
  join(target, 'package.json'),
  JSON.stringify(
    {
      name,
      private: true,
      type: 'module',
      description: `${name} — grown from the substrate nursery. App code imports each block's index.ts only.`,
      scripts: {
        start: 'node app/main.ts',
        test: blocks.map((b) => `node substrate/${b}/block.test.ts`).join(' && '),
        'insights:sync': 'node substrate/_kernel/sync-insights.ts',
        typecheck: 'tsc --noEmit',
      },
      devDependencies: { '@types/node': '^25.9.2', typescript: '^5.6.0' },
    },
    null,
    2,
  ) + '\n',
)

writeFileSync(
  join(target, 'app/main.ts'),
  `// app/main.ts — ${name}, grown from the substrate nursery.
//
// Build on the ports; never import an adapter. Swapping a grade is an env var
// (PERSIST_ADAPTER, LOG_ADAPTER, ...), zero changes here. Delete the demo routes
// and start writing your app.

process.env.PROJECT ??= '${name}' // FoT origin tag for lessons this project deposits

import { load } from '../substrate/env/index.ts'
import { getLogger } from '../substrate/logging/index.ts'
import { open, insights, type BaseRecord } from '../substrate/persistence/index.ts'
import { createRouter } from '../substrate/transport/index.ts'
import { validate, type Schema } from '../substrate/input-validation/index.ts'
import { guard } from '../substrate/request-guard/index.ts'

interface Item extends BaseRecord {
  name: string
}

const ITEM_SCHEMA: Schema = { name: { type: 'string', required: true, min: 1, max: 200 } }

const cfg = await load({ PORT: { default: '3000', parse: Number, describe: 'http listen port' } })
const log = await getLogger({ service: '${name}' })
const store = await open<Item>('items')

// FoT: lessons other projects learned about these blocks are already here.
log.info('federated lessons inherited', { persistence: insights().length })

const router = await createRouter()
const limiter = await guard({ limit: 1000, windowMs: 60_000 })
const validateItem = validate(ITEM_SCHEMA)

router.use((req) => (log.info('request', { method: req.method, path: req.path }), null))
router.use((req) => limiter(req))
router.use((req) => (req.method === 'POST' || req.method === 'PUT' ? validateItem(req) : null))

router.route('GET', '/health', () => ({ status: 200, body: { ok: true } }))
router.route('GET', '/items', async () => ({ status: 200, body: await store.list() }))
router.route('POST', '/items', async (req) => {
  const b = req.body as { name: string }
  return { status: 201, body: await store.create({ name: b.name }) }
})

const listening = await router.listen(Number(cfg.PORT))
log.info('listening', { url: listening.url })
`,
)

writeFileSync(
  join(target, 'README.md'),
  `# ${name}

Grown from the substrate nursery. The expensive plumbing is already working as blocks in
\`substrate/\`; the app in \`app/\` builds on each block's \`index.ts\` and nothing else.

\`\`\`sh
npm start            # run the starter service
npm test             # every block's invariants (gates, port invariance, AEvo protection)
npm run insights:sync # render federated FoT lessons into each block's insights.md
\`\`\`

No build step, no dependencies — Node 24 runs the TypeScript directly. Grades swap by env
var (e.g. \`PERSIST_ADAPTER=memory|file|graduated\`); gates in each block's \`gates.ts\` tell
you when a grade-up is required (\`checkGrade\`). Lessons deposited by other projects arrive
through \`~/.substrate/fot-store.json\` automatically.
`,
)

// Arm AEvo: the committed block.json baselines are the protection. No git, no arming —
// so the scaffold commits itself. Failure here is reported, not fatal.
let armed = false
try {
  const git = (...args: string[]) => execFileSync('git', args, { cwd: target, stdio: ['ignore', 'pipe', 'pipe'] })
  git('init')
  git('add', '-A')
  git('commit', '-m', `scaffold ${name} from the substrate nursery`)
  armed = true
} catch {
  /* no git available or identity unset — protection arms on the user's first commit */
}

console.log(`\n${name} created at ${target}`)
console.log(`  blocks: ${blocks.join(', ')}`)
console.log(`  AEvo protection: ${armed ? 'armed (initial commit made)' : 'arms on your first git commit'}`)
console.log(`\n  cd ${target}\n  npm test\n  npm start\n`)
